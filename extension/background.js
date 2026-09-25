import { ensureFreshSession, supabaseFetch, setSessionFromCookies, SUPABASE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from './supabase-rest.js'

// Platforms confirmed to block or degrade our server-side scraper —
// checked from the ACTUAL production Supabase edge network IP, not just a
// local test environment (Flipkart/Myntra initially looked fine from a
// local sandbox but return a fake maintenance page / HTTP 529 specifically
// to Supabase's IP range once tested from production). Only Amazon has
// been confirmed genuinely reliable from both.
const BLOCKED_HOSTS = ['nykaa.com', 'meesho.com', 'swiggy.com', 'flipkart.com', 'myntra.com']

const REFRESH_ALARM = 'willowwish-refresh'
const CHECK_INTERVAL_MINUTES = 480 // 8h — mirrors the server-side cron cadence
const DELAY_BETWEEN_ITEMS_MS = 2000
const SETTLE_AFTER_LOAD_MS = 3000 // let client-rendered pages finish hydrating before extracting

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: CHECK_INTERVAL_MINUTES })
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REFRESH_ALARM) runRefreshCycle()
})

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'REFRESH_NOW') {
    runRefreshCycle()
      .then((summary) => sendResponse({ ok: true, summary }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }))
    return true // keep the message channel open for the async response
  }

  // Called from the Quick Add flow (via bridge-content-script.js) so a
  // blocked-platform item doesn't sit blank until the next periodic cycle.
  if (msg?.type === 'FETCH_ITEM_NOW') {
    refreshItemViaServer(msg.url, msg.itemId)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }))
    return true
  }

  // Pushed by bridge-content-script.js whenever it runs on the website with
  // an active login — lets the extension act as the logged-in user without
  // its own separate login step.
  if (msg?.type === 'SYNC_SESSION_FROM_COOKIES') {
    setSessionFromCookies(msg.accessToken, msg.refreshToken, msg.expiresAt)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }))
    return true
  }
})

/** Extracts a product page's data from a live tab and hands it to
 * scrape-product's client_update mode, which does the actual DB write
 * (items patch + price_history + price-drop/target-met notifications).
 * The extension only ever fetches; the edge function is the one service
 * with the right permissions (service role) to write both tables —
 * price_history in particular has no direct-write RLS policy for regular
 * users, only the service-role-backed function can insert into it. Used by
 * both the periodic monitoring cycle and Quick Add's immediate fetch. */
async function refreshItemViaServer(url, itemId) {
  const session = await ensureFreshSession()
  if (!session) return { updated: false, reason: 'not_logged_in' }

  const extracted = await extractFromLiveTab(url)
  if (!extracted || (!(extracted.price > 0) && !extracted.image)) {
    return { updated: false, reason: 'nothing_extracted' }
  }
  await postClientUpdate(itemId, url, extracted, session)
  return { updated: true, extracted }
}

function isBlockedPlatformUrl(url) {
  try {
    const host = new URL(url).hostname
    return BLOCKED_HOSTS.some((h) => host === h || host.endsWith('.' + h))
  } catch {
    return false
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runRefreshCycle() {
  const session = await ensureFreshSession()
  if (!session) {
    console.log('[WillowWish] Not logged in — skipping refresh cycle.')
    return { checked: 0, updated: 0, loggedIn: false }
  }

  const items = await supabaseFetch(
    '/rest/v1/items?select=id,product_url&is_purchased=eq.false',
    { method: 'GET' },
    session
  )

  const targets = (items || []).filter((i) => i.product_url && isBlockedPlatformUrl(i.product_url))
  console.log(`[WillowWish] ${targets.length} blocked-platform item(s) to refresh.`)

  let updated = 0
  for (const item of targets) {
    try {
      const result = await refreshItemViaServer(item.product_url, item.id)
      if (result.updated) {
        updated++
      } else {
        console.log('[WillowWish] Nothing usable extracted for item', item.id, result.reason)
      }
    } catch (e) {
      console.log('[WillowWish] Failed to refresh item', item.id, e)
    }
    await sleep(DELAY_BETWEEN_ITEMS_MS)
  }

  return { checked: targets.length, updated, loggedIn: true }
}

async function extractFromLiveTab(url) {
  const tab = await chrome.tabs.create({ url, active: false })
  try {
    await waitForTabComplete(tab.id)
    await sleep(SETTLE_AFTER_LOAD_MS)

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (pageUrl) => {
        const mod = await import(chrome.runtime.getURL('content-extract.js'))
        return mod.extractProductData(document, pageUrl)
      },
      args: [url],
    })
    return result
  } finally {
    chrome.tabs.remove(tab.id).catch(() => {})
  }
}

function waitForTabComplete(tabId) {
  return new Promise((resolve) => {
    function listener(id, info) {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener)
        resolve()
      }
    }
    chrome.tabs.onUpdated.addListener(listener)
  })
}

async function postClientUpdate(itemId, url, extracted, session) {
  const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/scrape-product`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      url,
      itemId,
      mode: 'client_update',
      title: extracted.title,
      price: extracted.price,
      image: extracted.image,
    }),
  })
  if (!res.ok) {
    console.log('[WillowWish] client_update failed for item', itemId, await res.text())
  }
}

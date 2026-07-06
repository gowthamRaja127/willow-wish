import { ensureFreshSession, supabaseFetch, SUPABASE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from './supabase-rest.js'

// Only platforms confirmed (this session, via direct testing) to block our
// server-side scraper outright. Amazon/Flipkart/Myntra already work from
// the server and don't need a live tab.
const BLOCKED_HOSTS = ['nykaa.com', 'meesho.com', 'swiggy.com']

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
})

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
      const extracted = await extractFromLiveTab(item.product_url)
      if (extracted && (extracted.price > 0 || extracted.image)) {
        await postClientUpdate(item.id, item.product_url, extracted, session)
        updated++
      } else {
        console.log('[WillowWish] Nothing usable extracted for item', item.id)
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

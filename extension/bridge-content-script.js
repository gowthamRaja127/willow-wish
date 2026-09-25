// Runs on the Willow Wish website itself (see manifest.json content_scripts
// matches). Relays a narrow message channel between the page and this
// extension's background worker, so the website can ask "fetch this item's
// data right now" for platforms it can't scrape server-side, and detect
// whether the extension is even installed (the page can't call chrome.*
// APIs directly — this bridge is the only way in).

// The website writes plain (non-HttpOnly) cookies specifically so this
// content script can adopt its session — no separate extension login is
// needed. See src/app/core/services/supabase.service.ts's
// writeSessionCookies(). Cookie values are encodeURIComponent-encoded by
// CookieService, so they're decoded the same way here.
function readCookie(name) {
  const key = encodeURIComponent(name)
  const entry = document.cookie.split('; ').find((row) => row.startsWith(`${key}=`))
  if (!entry) return null
  return decodeURIComponent(entry.split('=').slice(1).join('='))
}

function syncSessionFromCookies() {
  const accessToken = readCookie('ww_access_token')
  const refreshToken = readCookie('ww_refresh_token')
  const expiresAt = readCookie('ww_expires_at')
  if (!accessToken || !refreshToken || !expiresAt) return // not logged into the website
  chrome.runtime.sendMessage({ type: 'SYNC_SESSION_FROM_COOKIES', accessToken, refreshToken, expiresAt })
}

syncSessionFromCookies()

// Matches manifest.json's content_scripts.matches for this file — this
// content script only ever runs on these origins, so a message claiming to
// be from 'willowwish-app' but posted from anywhere else (e.g. an embedded
// iframe, or a future broader content-script match) is rejected outright.
const ALLOWED_ORIGINS = [
  'https://willow-wish.pages.dev',
  'https://willowwish.dev',
  'http://localhost:4200',
]

function isAllowedOrigin(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) return true
  try {
    const { protocol, hostname } = new URL(origin)
    return protocol === 'https:' && (hostname.endsWith('.willow-wish.pages.dev') || hostname.endsWith('.willowwish.dev'))
  } catch {
    return false
  }
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return
  if (!isAllowedOrigin(event.origin)) return
  const data = event.data
  if (!data || data.source !== 'willowwish-app') return

  if (data.type === 'PING') {
    window.postMessage({ source: 'willowwish-extension', requestId: data.requestId, type: 'PONG' }, window.location.origin)
    return
  }

  if (data.type === 'FETCH_ITEM_NOW') {
    chrome.runtime.sendMessage(
      { type: 'FETCH_ITEM_NOW', url: data.url, itemId: data.itemId },
      (response) => {
        window.postMessage(
          { source: 'willowwish-extension', requestId: data.requestId, type: 'FETCH_ITEM_RESULT', response },
          window.location.origin
        )
      }
    )
  }
})

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

window.addEventListener('message', (event) => {
  if (event.source !== window) return
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

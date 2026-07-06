// Minimal, dependency-free Supabase Auth + PostgREST client. Deliberately
// avoids bundling @supabase/supabase-js: Chrome Web Store policy disallows
// remotely-hosted code, and the SDK would need a build step to vendor
// locally for an extension this small — a few fetch() calls are simpler
// and just as correct for what this extension needs.

export const SUPABASE_URL = 'https://kjbeotlksumouwedpvfz.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_kkaMmEXAF8MPSOWroWzuzQ_gMBpzyVc'
export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`

export async function login(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error_description || data?.msg || 'Login failed')

  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    email,
  }
  await chrome.storage.local.set({ session })
  return session
}

export async function logout() {
  await chrome.storage.local.remove('session')
}

export async function getSession() {
  const { session } = await chrome.storage.local.get('session')
  return session ?? null
}

/** Returns a valid session (refreshing the access token if needed), or null if logged out/refresh failed. */
export async function ensureFreshSession() {
  const session = await getSession()
  if (!session) return null
  if (Date.now() < session.expires_at - 60_000) return session // still valid, 1min safety buffer

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  })
  if (!res.ok) {
    await logout()
    return null
  }
  const data = await res.json()
  const refreshed = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    email: session.email,
  }
  await chrome.storage.local.set({ session: refreshed })
  return refreshed
}

export async function supabaseFetch(path, init, session) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
  })
  if (!res.ok) throw new Error(`Supabase request failed: ${res.status} ${await res.text()}`)
  return res.json()
}

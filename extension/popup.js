import { login, logout, getSession } from './supabase-rest.js'

const loginView = document.getElementById('loginView')
const loggedInView = document.getElementById('loggedInView')
const loginError = document.getElementById('loginError')
const whoami = document.getElementById('whoami')
const lastRun = document.getElementById('lastRun')

async function render() {
  const session = await getSession()
  if (session) {
    loginView.classList.add('hidden')
    loggedInView.classList.remove('hidden')
    whoami.textContent = `Logged in as ${session.email}`
    const { lastRunSummary } = await chrome.storage.local.get('lastRunSummary')
    lastRun.textContent = lastRunSummary
      ? `Last check: ${lastRunSummary.checked} checked, ${lastRunSummary.updated} updated`
      : 'No refresh run yet.'
  } else {
    loginView.classList.remove('hidden')
    loggedInView.classList.add('hidden')
  }
}

document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value
  loginError.classList.add('hidden')
  try {
    await login(email, password)
    await render()
  } catch (e) {
    loginError.textContent = String(e.message || e)
    loginError.classList.remove('hidden')
  }
})

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await logout()
  await render()
})

document.getElementById('refreshBtn').addEventListener('click', async () => {
  const btn = document.getElementById('refreshBtn')
  btn.disabled = true
  btn.textContent = 'Refreshing…'
  const response = await chrome.runtime.sendMessage({ type: 'REFRESH_NOW' })
  if (response?.ok) {
    await chrome.storage.local.set({ lastRunSummary: response.summary })
  }
  btn.disabled = false
  btn.textContent = 'Refresh now'
  await render()
})

render()

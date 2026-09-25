import { getSession } from './supabase-rest.js'

const sessionStatus = document.getElementById('sessionStatus')
const refreshBtn = document.getElementById('refreshBtn')

async function render() {
  const session = await getSession()
  if (session) {
    sessionStatus.textContent = 'Synced with your Willow Wish login.'
    sessionStatus.classList.remove('warn')
    const { lastRunSummary } = await chrome.storage.local.get('lastRunSummary')
    if (lastRunSummary) {
      sessionStatus.textContent += ` Last check: ${lastRunSummary.checked} checked, ${lastRunSummary.updated} updated.`
    }
  } else {
    sessionStatus.textContent = 'Not synced yet — open willowwish.dev while logged in, then reopen this popup.'
    sessionStatus.classList.add('warn')
  }
}

refreshBtn.addEventListener('click', async () => {
  refreshBtn.disabled = true
  refreshBtn.textContent = 'Refreshing…'
  const response = await chrome.runtime.sendMessage({ type: 'REFRESH_NOW' })
  if (response?.ok) {
    await chrome.storage.local.set({ lastRunSummary: response.summary })
  }
  refreshBtn.disabled = false
  refreshBtn.textContent = 'Refresh now'
  await render()
})

render()

import { getSession } from './supabase-rest.js'

const sessionStatus = document.getElementById('sessionStatus')
const refreshBtn = document.getElementById('refreshBtn')
const itemList = document.getElementById('itemList')

const REASON_LABELS = {
  nothing_extracted: 'no price/image found',
  not_logged_in: 'not logged in',
  error: 'request failed',
}

function renderItemList(details) {
  itemList.textContent = ''
  if (!details || details.length === 0) return

  for (const item of details) {
    const li = document.createElement('li')

    const name = document.createElement('span')
    name.className = 'name'
    name.textContent = item.name
    name.title = item.name

    const outcome = document.createElement('span')
    if (item.updated) {
      outcome.className = 'ok'
      outcome.textContent = '✓ Updated'
    } else {
      outcome.className = 'fail'
      outcome.textContent = `✗ ${REASON_LABELS[item.reason] || item.reason || 'failed'}`
    }

    li.append(name, outcome)
    itemList.appendChild(li)
  }
}

async function render() {
  const session = await getSession()
  if (session) {
    sessionStatus.textContent = 'Synced with your Willow Wish login.'
    sessionStatus.classList.remove('warn')
    const { lastRunSummary } = await chrome.storage.local.get('lastRunSummary')
    if (lastRunSummary) {
      sessionStatus.textContent += ` Last check: ${lastRunSummary.checked} checked, ${lastRunSummary.updated} updated.`
      renderItemList(lastRunSummary.details)
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

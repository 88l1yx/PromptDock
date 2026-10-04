import { _electron as electron } from 'playwright-core'
import electronPath from 'electron'
import { mkdir, readFile } from 'node:fs/promises'

const userDataPath = `${process.cwd()}/.codex/folder-check-${Date.now()}`
await mkdir(userDataPath, { recursive: true })
const packagedExecutable = process.env.PROMPT_DOCK_EXECUTABLE

const app = await electron.launch({
  executablePath: packagedExecutable || electronPath,
  args: packagedExecutable ? [`--user-data-dir=${userDataPath}`] : ['.', `--user-data-dir=${userDataPath}`],
  cwd: process.cwd()
})

const window = await app.firstWindow()
const errors = []
window.on('pageerror', (error) => errors.push(error.message))

await window.waitForLoadState('domcontentloaded')
await window.waitForTimeout(900)

await window.locator('.folder-create-button').click()
await window.waitForTimeout(150)

const folderButton = window.locator('.folder-button').first()
const folderId = await folderButton.getAttribute('data-folder-id')
const tabId = await window.locator('.tab-slot').first().getAttribute('data-tab-id')

if (!folderId || !tabId) {
  console.log(
    JSON.stringify(
      {
        folderCount: await window.locator('.folder-button').count(),
        tabCount: await window.locator('.tab-slot').count(),
        folderHtml: await window.locator('.folder-shelf').innerHTML(),
        tabHtml: await window.locator('.tab-rail').innerHTML()
      },
      null,
      2
    )
  )
  throw new Error('Folder or tab id was not created')
}

await folderButton.evaluate((element, sourceTabId) => {
  const transfer = new DataTransfer()
  transfer.setData('application/x-promptdock-tab', sourceTabId)
  element.dispatchEvent(
    new DragEvent('dragenter', {
      bubbles: true,
      cancelable: true,
      dataTransfer: transfer
    })
  )
}, tabId)

await window.waitForTimeout(180)
const dragFeedback = await folderButton.evaluate((element) => ({
  classes: element.className,
  transform: getComputedStyle(element).transform
}))
await window.screenshot({ path: '.codex/folder-drag-feedback.png' })

await folderButton.evaluate((element, sourceTabId) => {
  const transfer = new DataTransfer()
  transfer.setData('application/x-promptdock-tab', sourceTabId)
  element.dispatchEvent(
    new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: transfer
    })
  )
}, tabId)

await window.waitForTimeout(200)
await folderButton.click()
await window.waitForTimeout(120)
await window.screenshot({ path: '.codex/folder-view.png' })

const savedDocumentCount = await window.locator('.document-row').count()
const savedTitle = await window.locator('.document-title').first().innerText()

await window.locator('.document-open-button').first().click()
await window.waitForTimeout(180)

const afterOpen = {
  folderViewOpen: (await window.locator('.folder-view').count()) > 0,
  activeTabTitle: await window.locator('.tab-slot.is-active').getAttribute('title'),
  tabCount: await window.locator('.tab-slot').count()
}

await window.locator('.tab-slot.is-active .tab-close').click({ force: true })
await window.waitForTimeout(120)
await folderButton.click()
await window.waitForTimeout(120)

const afterCloseTab = {
  documentRows: await window.locator('.document-row').count(),
  folderCount: await window.locator('.folder-count').first().innerText()
}

await window.getByTitle('返回编辑器').click()
await window.locator('.syntax-trigger').click()

const menuMetrics = await window.locator('.syntax-menu').evaluate((element) => {
  const rect = element.getBoundingClientRect()

  return {
    top: rect.top,
    bottom: rect.bottom,
    viewportHeight: window.innerHeight,
    withinWindow: rect.top >= 0 && rect.bottom <= window.innerHeight
  }
})

await window.getByRole('option', { name: 'Markdown' }).click()
await window.waitForTimeout(450)

await window.locator('.folder-create-button').click()
await window.waitForTimeout(120)
const folderCount = await window.locator('.folder-button').count()

const persisted = JSON.parse(await readFile(`${userDataPath}/workspace.json`, 'utf8'))
const result = {
  dragFeedback,
  savedDocumentCount,
  savedTitle,
  afterOpen,
  afterCloseTab,
  menuMetrics,
  syntaxLabel: await window.locator('.syntax-trigger span').innerText(),
  folderCount,
  persistedDocuments: persisted.folders?.[0]?.documents?.length ?? 0,
  errors
}

console.log(JSON.stringify(result, null, 2))
await app.close()

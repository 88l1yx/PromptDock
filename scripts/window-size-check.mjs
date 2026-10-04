import { _electron as electron } from 'playwright-core'
import electronPath from 'electron'
import { mkdir, readFile } from 'node:fs/promises'

const userDataPath = `${process.cwd()}/.codex/window-size-check-${Date.now()}`
await mkdir(userDataPath, { recursive: true })
const packagedExecutable = process.env.PROMPT_DOCK_EXECUTABLE

async function launchApp() {
  const app = await electron.launch({
    executablePath: packagedExecutable || electronPath,
    args: packagedExecutable ? [`--user-data-dir=${userDataPath}`] : ['.', `--user-data-dir=${userDataPath}`],
    cwd: process.cwd()
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')
  await window.waitForTimeout(900)
  return { app, window }
}

const first = await launchApp()
await first.app.evaluate(({ BrowserWindow }) => {
  BrowserWindow.getAllWindows()[0].setSize(700, 900)
})
await first.window.waitForTimeout(180)

const sizeBeforeSave = await first.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds())

await first.window.getByTitle('保存当前窗口尺寸').click()
await first.window.locator('.save-window-button.is-saved').waitFor({ timeout: 3000 })

const saveAnimation = await first.window.locator('.save-window-button').evaluate((element) => ({
  className: element.className,
  animationName: getComputedStyle(element).animationName
}))

await first.window.waitForTimeout(500)
await first.app.close()

const persisted = JSON.parse(await readFile(`${userDataPath}/workspace.json`, 'utf8'))

const second = await launchApp()
const restoredSize = await second.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds())
await second.app.close()

console.log(
  JSON.stringify(
    {
      sizeBeforeSave,
      saveAnimation,
      persistedWindowSize: persisted.windowSize,
      restoredSize
    },
    null,
    2
  )
)

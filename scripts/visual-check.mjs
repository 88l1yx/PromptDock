import { _electron as electron } from 'playwright-core'
import electronPath from 'electron'
import { mkdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

const errors = []
const consoleMessages = []
const testUserData = `${process.cwd()}/.codex/test-user-data-${Date.now()}`

function readCursorPosition() {
  const output = execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      "Add-Type -AssemblyName System.Windows.Forms; $p = [System.Windows.Forms.Cursor]::Position; Write-Output \"$($p.X),$($p.Y)\""
    ],
    { encoding: 'utf8' }
  ).trim()
  const [x, y] = output.split(',').map(Number)
  return { x, y }
}

function setCursorPosition(x, y) {
  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})`
    ],
    { stdio: 'ignore' }
  )
}

function dragMouse(startX, startY, endX, endY) {
  const steps = 14
  const script = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class MouseDragNative {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extraInfo);
}
'@
[MouseDragNative]::SetCursorPos(${startX}, ${startY}) | Out-Null
Start-Sleep -Milliseconds 120
[MouseDragNative]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
for ($index = 1; $index -le ${steps}; $index++) {
  $progress = $index / ${steps}
  $x = [Math]::Round(${startX} + (${endX} - ${startX}) * $progress)
  $y = [Math]::Round(${startY} + (${endY} - ${startY}) * $progress)
  [MouseDragNative]::SetCursorPos($x, $y) | Out-Null
  Start-Sleep -Milliseconds 24
}
Start-Sleep -Milliseconds 80
[MouseDragNative]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
`

  execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { stdio: 'ignore' })
}

await mkdir(testUserData, { recursive: true })
const originalCursor = readCursorPosition()

const app = await electron.launch({
  executablePath: electronPath,
  args: ['.', `--user-data-dir=${testUserData}`],
  cwd: process.cwd()
})

const window = await app.firstWindow()
window.on('pageerror', (error) => errors.push(error.message))
window.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') {
    consoleMessages.push(`${message.type()}: ${message.text()}`)
  }
})

await window.waitForLoadState('domcontentloaded')
await window.waitForTimeout(1200)
await window.evaluate(() => document.fonts.ready)

const bodyText = await window.locator('body').innerText()
const bodyPreview = await window.evaluate(() => document.body.innerHTML.slice(0, 800))
const fontFamily = await window.locator('.titlebar-title').evaluate((element) => getComputedStyle(element).fontFamily)

await window.screenshot({
  path: '.codex/ui-dark.png'
})

await window.getByTitle('切换到浅色模式').click()
await window.waitForTimeout(200)
await window.screenshot({
  path: '.codex/ui-light.png'
})

const plusBeforeScroll = await window.locator('.add-tab-button').boundingBox()
for (let index = 0; index < 12; index += 1) {
  await window.locator('.add-tab-button').click()
}
await window.locator('.cm-content').click()
await window.keyboard.type('[task]\n验证多页面文本记录与自动保存。')
await window.locator('.tab-list').evaluate((element) => {
  element.scrollTop = element.scrollHeight
})
await window.waitForTimeout(450)
await window.screenshot({
  path: '.codex/ui-multi-tab.png'
})

const tabCount = await window.locator('.tab-slot').count()
const plusAfterScroll = await window.locator('.add-tab-button').boundingBox()
const plusIsFixed = Boolean(
  plusBeforeScroll &&
    plusAfterScroll &&
    Math.abs(plusBeforeScroll.y - plusAfterScroll.y) < 1 &&
    plusAfterScroll.y >= 0
)
const dockBefore = await app.evaluate(({ BrowserWindow, screen }) => {
  const targetWindow = BrowserWindow.getAllWindows()[0]
  const display = screen.getPrimaryDisplay()
  const bounds = targetWindow.getBounds()

  targetWindow.setBounds({
    ...bounds,
    x: display.bounds.x + display.bounds.width - bounds.width - 420,
    y: display.workArea.y + 80
  })

  return {
    bounds: targetWindow.getBounds(),
    rightEdge: display.bounds.x + display.bounds.width
  }
})

setCursorPosition(80, 80)
await window.waitForTimeout(2200)

const dockAfter = await app.evaluate(({ BrowserWindow, screen }) => {
  const targetWindow = BrowserWindow.getAllWindows()[0]
  const display = screen.getPrimaryDisplay()

  return {
    visible: targetWindow.isVisible(),
    bounds: targetWindow.getBounds(),
    rightEdge: display.bounds.x + display.bounds.width
  }
})
const hiddenClass = await window.locator('.app-shell').evaluate((element) => element.classList.contains('is-docked-hidden'))
const collapsedTransform = await window
  .locator('.app-shell')
  .evaluate((element) => getComputedStyle(element).transform)
const transitionDuration = await window
  .locator('.app-shell')
  .evaluate((element) => getComputedStyle(element).transitionDuration)

setCursorPosition(2555, 200)
await window.waitForTimeout(900)

const showAfterHover = await app.evaluate(({ BrowserWindow, screen }) => {
  const targetWindow = BrowserWindow.getAllWindows()[0]
  const display = screen.getPrimaryDisplay()

  return {
    visible: targetWindow.isVisible(),
    bounds: targetWindow.getBounds(),
    rightEdge: display.bounds.x + display.bounds.width
  }
})
const hiddenAfterHover = await window.locator('.app-shell').evaluate((element) =>
  element.classList.contains('is-docked-hidden')
)

const expandedBounds = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds())
dragMouse(
  Math.round(expandedBounds.x + expandedBounds.width * 0.45),
  Math.round(expandedBounds.y + 18),
  Math.round(expandedBounds.x - 170),
  Math.round(expandedBounds.y + 18)
)
await window.waitForTimeout(1000)

const dragAfter = await app.evaluate(({ BrowserWindow, screen }) => {
  const targetWindow = BrowserWindow.getAllWindows()[0]
  const display = screen.getPrimaryDisplay()

  return {
    bounds: targetWindow.getBounds(),
    rightEdge: display.bounds.x + display.bounds.width
  }
})

setCursorPosition(originalCursor.x, originalCursor.y)

console.log(
  JSON.stringify(
    {
      title: await window.title(),
      bodyText,
      bodyPreview,
      fontFamily,
      tabCount,
      plusIsFixed,
      plusBeforeScroll,
      plusAfterScroll,
      dockBefore,
      dockAfter,
      hiddenClass,
      collapsedTransform,
      transitionDuration,
      showAfterHover,
      hiddenAfterHover,
      dragAfter,
      pageErrors: errors,
      consoleMessages
    },
    null,
    2
  )
)

await app.close()

import { _electron as electron } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const executablePath = resolve('release/win-unpacked/PromptDock.exe')
const userDataPath = resolve(`.codex/packaged-check-${Date.now()}`)
await mkdir(userDataPath, { recursive: true })

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

const originalCursor = readCursorPosition()
const app = await electron.launch({
  executablePath,
  args: [`--user-data-dir=${userDataPath}`]
})

const window = await app.firstWindow()
await window.waitForLoadState('domcontentloaded')
await window.waitForTimeout(1000)

await app.evaluate(({ BrowserWindow, screen }) => {
  const targetWindow = BrowserWindow.getAllWindows()[0]
  const display = screen.getPrimaryDisplay()
  const bounds = targetWindow.getBounds()

  targetWindow.setBounds({
    ...bounds,
    x: display.bounds.x + display.bounds.width - bounds.width - 10,
    y: display.workArea.y + 80
  })
})

setCursorPosition(80, 80)
await window.waitForTimeout(1700)

const collapsed = await window.locator('.app-shell').evaluate((element) => {
  const style = getComputedStyle(element)
  const strip = getComputedStyle(element, '::before')

  return {
    classes: element.className,
    transform: style.transform,
    transitionDuration: style.transitionDuration,
    stripPosition: strip.position,
    stripWidth: strip.width,
    stripOpacity: strip.opacity
  }
})

await window.screenshot({
  path: '.codex/packaged-dom-collapsed.png',
  omitBackground: true
})

setCursorPosition(2555, 200)
await window.waitForTimeout(700)

const expanded = await window.locator('.app-shell').evaluate((element) => {
  const style = getComputedStyle(element)

  return {
    classes: element.className,
    transform: style.transform
  }
})

await window.screenshot({
  path: '.codex/packaged-dom-expanded.png'
})

setCursorPosition(originalCursor.x, originalCursor.y)

console.log(JSON.stringify({ collapsed, expanded }, null, 2))

await app.close()

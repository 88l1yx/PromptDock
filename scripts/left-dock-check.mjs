import { _electron as electron } from 'playwright-core'
import electronPath from 'electron'
import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'

const userDataPath = `${process.cwd()}/.codex/left-dock-check-${Date.now()}`
await mkdir(userDataPath, { recursive: true })
const packagedExecutable = process.env.PROMPT_DOCK_EXECUTABLE

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
  executablePath: packagedExecutable || electronPath,
  args: packagedExecutable ? [`--user-data-dir=${userDataPath}`] : ['.', `--user-data-dir=${userDataPath}`],
  cwd: process.cwd()
})

const window = await app.firstWindow()
await window.waitForLoadState('domcontentloaded')
await window.waitForTimeout(800)

const before = await app.evaluate(({ BrowserWindow, screen }) => {
  const targetWindow = BrowserWindow.getAllWindows()[0]
  const display = screen.getPrimaryDisplay()
  const bounds = targetWindow.getBounds()

  targetWindow.setBounds({
    ...bounds,
    x: display.bounds.x + 420,
    y: display.workArea.y + 80
  })

  return {
    bounds: targetWindow.getBounds(),
    leftEdge: display.bounds.x
  }
})

setCursorPosition(1000, 100)
await window.waitForTimeout(1700)

const collapsed = await app.evaluate(({ BrowserWindow, screen }) => {
  const targetWindow = BrowserWindow.getAllWindows()[0]
  const display = screen.getPrimaryDisplay()

  return {
    bounds: targetWindow.getBounds(),
    leftEdge: display.bounds.x
  }
})

const collapsedStyle = await window.locator('.app-shell').evaluate((element) => {
  const style = getComputedStyle(element)
  const strip = getComputedStyle(element, '::before')

  return {
    classes: element.className,
    transform: style.transform,
    stripRight: strip.right,
    stripWidth: strip.width
  }
})

setCursorPosition(5, 200)
await window.waitForTimeout(650)

const expandedStyle = await window.locator('.app-shell').evaluate((element) => ({
  classes: element.className,
  transform: getComputedStyle(element).transform
}))

setCursorPosition(originalCursor.x, originalCursor.y)

console.log(JSON.stringify({ before, collapsed, collapsedStyle, expandedStyle }, null, 2))

await app.close()

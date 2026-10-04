import { _electron as electron } from 'playwright-core'
import electronPath from 'electron'
import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'

const userDataPath = `${process.cwd()}/.codex/side-edge-check-${Date.now()}`
await mkdir(userDataPath, { recursive: true })
const packagedExecutable = process.env.PROMPT_DOCK_EXECUTABLE

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

const originalCursor = readCursorPosition()
const app = await electron.launch({
  executablePath: packagedExecutable || electronPath,
  args: packagedExecutable ? [`--user-data-dir=${userDataPath}`] : ['.', `--user-data-dir=${userDataPath}`],
  cwd: process.cwd()
})

const window = await app.firstWindow()
await window.waitForLoadState('domcontentloaded')
await window.waitForTimeout(800)

const placement = await app.evaluate(({ BrowserWindow, screen }) => {
  const targetWindow = BrowserWindow.getAllWindows()[0]
  const display = screen.getPrimaryDisplay()
  const bounds = targetWindow.getBounds()

  targetWindow.setBounds({
    ...bounds,
    x: display.bounds.x + display.bounds.width - bounds.width - 220,
    y: display.workArea.y + 80
  })

  return {
    displayBounds: display.bounds,
    bounds: targetWindow.getBounds()
  }
})

setCursorPosition(1000, 100)
await window.waitForTimeout(1700)

const collapsedBounds = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds())
const displayRight = placement.displayBounds.x + placement.displayBounds.width
const displayBottom = placement.displayBounds.y + placement.displayBounds.height

setCursorPosition(displayRight - 2, displayBottom - 20)
await window.waitForTimeout(1200)

const hiddenAtOutsideEdge = await window.locator('.app-shell').evaluate((element) =>
  element.classList.contains('is-docked-hidden')
)

setCursorPosition(displayRight - 2, Math.round(collapsedBounds.y + collapsedBounds.height / 2))
await window.waitForTimeout(500)

const hiddenAtWindowEdge = await window.locator('.app-shell').evaluate((element) =>
  element.classList.contains('is-docked-hidden')
)

setCursorPosition(originalCursor.x, originalCursor.y)

console.log(
  JSON.stringify(
    {
      collapsedBounds,
      outsideEdgeY: displayBottom - 20,
      hiddenAtOutsideEdge,
      hiddenAtWindowEdge
    },
    null,
    2
  )
)

await app.close()

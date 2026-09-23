import { app, BrowserWindow, globalShortcut, ipcMain, nativeTheme, screen } from 'electron'
import { join } from 'node:path'
import type { WorkspaceState } from '../shared/types'
import { DockController } from './dockController'
import { WorkspaceStore } from './workspaceStore'

let mainWindow: BrowserWindow | null = null
let dockController: DockController | null = null
let workspaceStore: WorkspaceStore | null = null

function createWindow(initialState: WorkspaceState): BrowserWindow {
  const windowIcon = app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(__dirname, '../../build/icon.png')

  const window = new BrowserWindow({
    width: 540,
    height: 760,
    minWidth: 360,
    minHeight: 420,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    icon: windowIcon,
    alwaysOnTop: true,
    resizable: true,
    roundedCorners: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  window.setAlwaysOnTop(true, 'floating')

  window.on('ready-to-show', () => {
    window.show()
    window.focus()
  })

  window.on('closed', () => {
    dockController?.stop()
    dockController = null
    mainWindow = null
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  dockController = new DockController(window, (snapshot) => {
    if (!window.isDestroyed()) {
      window.webContents.send('dock:state', snapshot)
    }
  })
  dockController.start()
  dockController.setPinned(initialState.pinExpanded)

  return window
}

function registerIpcHandlers(): void {
  ipcMain.handle('workspace:load', () => workspaceStore?.getSnapshot())

  ipcMain.handle('workspace:save', async (_event, state: WorkspaceState) => {
    await workspaceStore?.save(state)
  })

  ipcMain.handle('window:close', () => {
    mainWindow?.close()
  })

  ipcMain.on('dock:set-pinned', (_event, pinned: boolean) => {
    dockController?.setPinned(Boolean(pinned))
  })

  ipcMain.on('dock:activity', () => {
    dockController?.markActivity()
  })
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    if (!mainWindow.isVisible()) {
      mainWindow.show()
    }
    mainWindow.focus()
  })

  app.whenReady().then(async () => {
  app.setAppUserModelId('com.promptdock.app')
  workspaceStore = new WorkspaceStore()
  const initialState = await workspaceStore.load()
  nativeTheme.themeSource = initialState.theme

  registerIpcHandlers()
  mainWindow = createWindow(initialState)

  globalShortcut.register('CommandOrControl+Alt+Space', () => {
    if (!mainWindow) {
      return
    }

    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  screen.on('display-removed', () => {
    if (!mainWindow) {
      return
    }

    const display = screen.getDisplayMatching(mainWindow.getBounds())
    mainWindow.setBounds({
      ...mainWindow.getBounds(),
      x: Math.min(mainWindow.getBounds().x, display.workArea.x + display.workArea.width - mainWindow.getBounds().width)
    })
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow(workspaceStore?.getSnapshot() ?? initialState)
    }
  })
  })
}

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

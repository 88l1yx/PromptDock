import { contextBridge, ipcRenderer } from 'electron'
import type { DockSnapshot, PromptDockApi, WorkspaceState } from '../shared/types'

const api: PromptDockApi = {
  loadWorkspace: () => ipcRenderer.invoke('workspace:load') as Promise<WorkspaceState>,
  saveWorkspace: (state) => ipcRenderer.invoke('workspace:save', state) as Promise<void>,
  closeWindow: () => ipcRenderer.invoke('window:close') as Promise<void>,
  setPinned: (pinned) => ipcRenderer.send('dock:set-pinned', pinned),
  reportActivity: () => ipcRenderer.send('dock:activity'),
  onDockState: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, snapshot: DockSnapshot): void => {
      listener(snapshot)
    }

    ipcRenderer.on('dock:state', handler)

    return () => {
      ipcRenderer.removeListener('dock:state', handler)
    }
  }
}

contextBridge.exposeInMainWorld('promptDock', api)

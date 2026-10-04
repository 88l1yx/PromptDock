import { create } from 'zustand'
import type {
  DocumentFolder,
  NoteTab,
  SavedDocument,
  SyntaxMode,
  ThemeMode,
  WorkspaceState
} from '@shared/types'

interface WorkspaceStore extends WorkspaceState {
  hydrated: boolean
  hydrate: (state: WorkspaceState) => void
  addTab: () => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTabContent: (id: string, content: string) => void
  setTheme: (theme: ThemeMode) => void
  setSyntaxMode: (mode: SyntaxMode) => void
  setPinExpanded: (pinned: boolean) => void
  addFolder: () => string
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void
  saveTabToFolder: (tabId: string, folderId: string) => void
  deleteSavedDocument: (folderId: string, documentId: string) => void
  openSavedDocument: (folderId: string, documentId: string) => void
}

function createTab(index: number): NoteTab {
  return {
    id: crypto.randomUUID(),
    title: `Prompt ${String(index).padStart(2, '0')}`,
    content: '',
    updatedAt: new Date().toISOString()
  }
}

function deriveTitle(content: string, fallback: string): string {
  const firstLine = content
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)

  if (!firstLine) {
    return fallback
  }

  const cleaned = firstLine.replace(/^#+\s*/, '').replace(/^\[([^\]]+)\]$/, '$1').trim()
  return cleaned.slice(0, 28) || fallback
}

function replaceFolder(
  folders: DocumentFolder[],
  folderId: string,
  update: (folder: DocumentFolder) => DocumentFolder
): DocumentFolder[] {
  return folders.map((folder) => (folder.id === folderId ? update(folder) : folder))
}

const initialTab = createTab(1)

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  version: 1,
  tabs: [initialTab],
  folders: [],
  activeTabId: initialTab.id,
  theme: 'dark',
  syntaxMode: 'prompt',
  pinExpanded: false,
  hydrated: false,
  hydrate: (state) =>
    set({
      ...state,
      folders: state.folders ?? [],
      hydrated: true
    }),
  addTab: () =>
    set((state) => {
      const tab = createTab(state.tabs.length + 1)

      return {
        tabs: [...state.tabs, tab],
        activeTabId: tab.id
      }
    }),
  closeTab: (id) =>
    set((state) => {
      const closingIndex = state.tabs.findIndex((tab) => tab.id === id)
      let tabs = state.tabs.filter((tab) => tab.id !== id)

      if (!tabs.length) {
        tabs = [createTab(1)]
      }

      const activeTabId =
        state.activeTabId === id
          ? (tabs[Math.min(Math.max(closingIndex, 0), tabs.length - 1)]?.id ?? tabs[0].id)
          : state.activeTabId

      return {
        tabs,
        activeTabId
      }
    }),
  setActiveTab: (id) => set({ activeTabId: id }),
  updateTabContent: (id, content) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === id
          ? {
              ...tab,
              content,
              title: deriveTitle(content, tab.title),
              updatedAt: new Date().toISOString()
            }
          : tab
      )
    })),
  setTheme: (theme) => set({ theme }),
  setSyntaxMode: (syntaxMode) => set({ syntaxMode }),
  setPinExpanded: (pinExpanded) => set({ pinExpanded }),
  addFolder: () => {
    const id = crypto.randomUUID()

    set((state) => ({
      folders: [
        ...state.folders,
        {
          id,
          name: `文件夹 ${state.folders.length + 1}`,
          documents: []
        }
      ]
    }))

    return id
  },
  renameFolder: (id, name) =>
    set((state) => ({
      folders: replaceFolder(state.folders, id, (folder) => ({
        ...folder,
        name: name.trim() || folder.name
      }))
    })),
  deleteFolder: (id) =>
    set((state) => ({
      folders: state.folders.filter((folder) => folder.id !== id)
    })),
  saveTabToFolder: (tabId, folderId) =>
    set((state) => {
      const tab = state.tabs.find((candidate) => candidate.id === tabId)
      if (!tab) {
        return state
      }

      return {
        folders: replaceFolder(state.folders, folderId, (folder) => {
          const existing = folder.documents.find((document) => document.sourceTabId === tab.id)
          const document: SavedDocument = {
            id: existing?.id ?? crypto.randomUUID(),
            title: tab.title,
            content: tab.content,
            savedAt: new Date().toISOString(),
            sourceTabId: tab.id
          }

          return {
            ...folder,
            documents: existing
              ? folder.documents.map((candidate) => (candidate.id === existing.id ? document : candidate))
              : [document, ...folder.documents]
          }
        })
      }
    }),
  deleteSavedDocument: (folderId, documentId) =>
    set((state) => ({
      folders: replaceFolder(state.folders, folderId, (folder) => ({
        ...folder,
        documents: folder.documents.filter((document) => document.id !== documentId)
      }))
    })),
  openSavedDocument: (folderId, documentId) =>
    set((state) => {
      const folder = state.folders.find((candidate) => candidate.id === folderId)
      const document = folder?.documents.find((candidate) => candidate.id === documentId)
      if (!document) {
        return state
      }

      const existingTab = state.tabs.find((tab) => tab.sourceDocumentId === document.id)
      if (existingTab) {
        return {
          activeTabId: existingTab.id
        }
      }

      const tab: NoteTab = {
        id: crypto.randomUUID(),
        title: document.title,
        content: document.content,
        updatedAt: new Date().toISOString(),
        sourceDocumentId: document.id,
        sourceFolderId: folderId
      }

      return {
        tabs: [tab, ...state.tabs],
        activeTabId: tab.id
      }
    })
}))

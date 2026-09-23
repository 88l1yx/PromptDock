import { create } from 'zustand'
import type { NoteTab, SyntaxMode, ThemeMode, WorkspaceState } from '@shared/types'

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

const initialTab = createTab(1)

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  version: 1,
  tabs: [initialTab],
  activeTabId: initialTab.id,
  theme: 'dark',
  syntaxMode: 'prompt',
  pinExpanded: false,
  hydrated: false,
  hydrate: (state) =>
    set({
      ...state,
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
  setPinExpanded: (pinExpanded) => set({ pinExpanded })
}))

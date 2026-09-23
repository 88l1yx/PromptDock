export type ThemeMode = 'light' | 'dark'

export type SyntaxMode = 'prompt' | 'markdown' | 'text' | 'json' | 'javascript'

export interface NoteTab {
  id: string
  title: string
  content: string
  updatedAt: string
}

export interface WorkspaceState {
  version: 1
  tabs: NoteTab[]
  activeTabId: string
  theme: ThemeMode
  syntaxMode: SyntaxMode
  pinExpanded: boolean
}

export interface DockSnapshot {
  docked: boolean
  hidden: boolean
  pinned: boolean
  phase: 'free' | 'docked' | 'collapsing' | 'hidden' | 'expanding'
  edge: 'left' | 'right' | null
}

export interface PromptDockApi {
  loadWorkspace: () => Promise<WorkspaceState>
  saveWorkspace: (state: WorkspaceState) => Promise<void>
  closeWindow: () => Promise<void>
  setPinned: (pinned: boolean) => void
  reportActivity: () => void
  onDockState: (listener: (snapshot: DockSnapshot) => void) => () => void
}

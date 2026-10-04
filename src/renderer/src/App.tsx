import { useEffect, useMemo, useState } from 'react'
import type { DockSnapshot, WorkspaceState } from '@shared/types'
import { EditorPane } from './editor/EditorPane'
import { FolderView } from './components/FolderView'
import { StatusBar } from './components/StatusBar'
import { TabRail } from './components/TabRail'
import { TitleBar } from './components/TitleBar'
import { useWorkspaceStore } from './store/workspace'

type SaveStatus = 'saved' | 'saving' | 'error'

export default function App(): React.JSX.Element {
  const tabs = useWorkspaceStore((state) => state.tabs)
  const folders = useWorkspaceStore((state) => state.folders)
  const activeTabId = useWorkspaceStore((state) => state.activeTabId)
  const theme = useWorkspaceStore((state) => state.theme)
  const syntaxMode = useWorkspaceStore((state) => state.syntaxMode)
  const pinExpanded = useWorkspaceStore((state) => state.pinExpanded)
  const hydrated = useWorkspaceStore((state) => state.hydrated)
  const hydrate = useWorkspaceStore((state) => state.hydrate)
  const addTab = useWorkspaceStore((state) => state.addTab)
  const closeTab = useWorkspaceStore((state) => state.closeTab)
  const setActiveTab = useWorkspaceStore((state) => state.setActiveTab)
  const updateTabContent = useWorkspaceStore((state) => state.updateTabContent)
  const setTheme = useWorkspaceStore((state) => state.setTheme)
  const setSyntaxMode = useWorkspaceStore((state) => state.setSyntaxMode)
  const setPinExpanded = useWorkspaceStore((state) => state.setPinExpanded)
  const addFolder = useWorkspaceStore((state) => state.addFolder)
  const renameFolder = useWorkspaceStore((state) => state.renameFolder)
  const deleteFolder = useWorkspaceStore((state) => state.deleteFolder)
  const saveTabToFolder = useWorkspaceStore((state) => state.saveTabToFolder)
  const deleteSavedDocument = useWorkspaceStore((state) => state.deleteSavedDocument)
  const openSavedDocument = useWorkspaceStore((state) => state.openSavedDocument)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [openFolderId, setOpenFolderId] = useState<string | null>(null)
  const [dockState, setDockState] = useState<DockSnapshot>({
    docked: false,
    hidden: false,
    pinned: false,
    phase: 'free',
    edge: null
  })

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0],
    [activeTabId, tabs]
  )
  const openFolder = useMemo(
    () => folders.find((folder) => folder.id === openFolderId) ?? null,
    [folders, openFolderId]
  )

  useEffect(() => {
    let cancelled = false

    void window.promptDock.loadWorkspace().then((state) => {
      if (cancelled) {
        return
      }

      hydrate(state)
      window.promptDock.setPinned(state.pinExpanded)
    })

    return () => {
      cancelled = true
    }
  }, [hydrate])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => window.promptDock.onDockState(setDockState), [])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    setSaveStatus('saving')
    const timer = setTimeout(async () => {
      const state = useWorkspaceStore.getState()
      const snapshot: WorkspaceState = {
        version: 1,
        tabs: state.tabs,
        folders: state.folders,
        activeTabId: state.activeTabId,
        theme: state.theme,
        syntaxMode: state.syntaxMode,
        pinExpanded: state.pinExpanded
      }

      try {
        await window.promptDock.saveWorkspace(snapshot)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [activeTabId, folders, hydrated, pinExpanded, syntaxMode, tabs, theme])

  useEffect(() => {
    if (openFolderId && !folders.some((folder) => folder.id === openFolderId)) {
      setOpenFolderId(null)
    }
  }, [folders, openFolderId])

  if (!activeTab) {
    return <main className="loading-shell">正在整理文本...</main>
  }

  const handleTogglePin = (): void => {
    const next = !pinExpanded
    setPinExpanded(next)
    window.promptDock.setPinned(next)
  }

  return (
    <main
      className={`app-shell ${
        dockState.phase === 'collapsing' || dockState.phase === 'hidden' ? 'is-docked-hidden' : ''
      } ${dockState.edge === 'left' ? 'is-docked-left' : ''}`}
    >
      <TitleBar
        title={activeTab.title}
        theme={theme}
        pinned={pinExpanded}
        onClose={() => void window.promptDock.closeWindow()}
        onTogglePin={handleTogglePin}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />

      <section className="workspace">
        <TabRail
          tabs={tabs}
          folders={folders}
          activeTabId={activeTab.id}
          activeFolderId={openFolder?.id ?? null}
          onAdd={addTab}
          onSelect={setActiveTab}
          onClose={closeTab}
          onOpenFolder={setOpenFolderId}
          onCreateFolder={() => setOpenFolderId(addFolder())}
          onSaveTabToFolder={saveTabToFolder}
        />
        <div className="editor-host">
          {openFolder ? (
            <FolderView
              folder={openFolder}
              onClose={() => setOpenFolderId(null)}
              onRename={renameFolder}
              onDelete={(folderId) => {
                deleteFolder(folderId)
                setOpenFolderId(null)
              }}
              onOpenDocument={(folderId, documentId) => {
                openSavedDocument(folderId, documentId)
                setOpenFolderId(null)
              }}
              onDeleteDocument={deleteSavedDocument}
            />
          ) : (
            <EditorPane
              value={activeTab.content}
              theme={theme}
              syntaxMode={syntaxMode}
              onChange={(value) => updateTabContent(activeTab.id, value)}
              onActivity={() => window.promptDock.reportActivity()}
            />
          )}
        </div>
      </section>

      <StatusBar
        characterCount={activeTab.content.length}
        syntaxMode={syntaxMode}
        saveStatus={saveStatus}
        onSyntaxModeChange={setSyntaxMode}
      />
    </main>
  )
}

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { DocumentFolder, NoteTab } from '@shared/types'
import { FolderShelf } from './FolderShelf'

interface TabRailProps {
  tabs: NoteTab[]
  folders: DocumentFolder[]
  activeTabId: string
  activeFolderId: string | null
  onAdd: () => void
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onOpenFolder: (id: string) => void
  onCreateFolder: () => void
  onSaveTabToFolder: (tabId: string, folderId: string) => void
}

export function TabRail({
  tabs,
  folders,
  activeTabId,
  activeFolderId,
  onAdd,
  onSelect,
  onClose,
  onOpenFolder,
  onCreateFolder,
  onSaveTabToFolder
}: TabRailProps): React.JSX.Element {
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null)

  return (
    <nav className="tab-rail" aria-label="文本页面">
      <button className="add-tab-button" type="button" title="新建文本页面" onClick={onAdd}>
        <Plus size={18} />
      </button>

      <div className="tab-list">
        {tabs.map((tab, index) => {
          const active = tab.id === activeTabId

          return (
            <div
              className={`tab-slot ${active ? 'is-active' : ''} ${
                draggingTabId === tab.id ? 'is-dragging' : ''
              }`}
              key={tab.id}
              data-tab-id={tab.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'copy'
                event.dataTransfer.setData('application/x-promptdock-tab', tab.id)
                event.dataTransfer.setData('text/plain', tab.id)
                setDraggingTabId(tab.id)
              }}
              onDragEnd={() => setDraggingTabId(null)}
            >
              <button
                className="tab-button"
                type="button"
                title={tab.title}
                aria-label={tab.title}
                aria-current={active}
                onClick={() => onSelect(tab.id)}
              >
                <span className="tab-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="tab-glyph">{tab.title.slice(0, 1).toUpperCase()}</span>
              </button>
              <button
                className="tab-close"
                type="button"
                title="关闭此页"
                aria-label={`关闭 ${tab.title}`}
                onClick={() => onClose(tab.id)}
              >
                <X size={10} strokeWidth={2} />
              </button>
            </div>
          )
        })}
      </div>

      <FolderShelf
        folders={folders}
        activeFolderId={activeFolderId}
        onOpenFolder={onOpenFolder}
        onCreateFolder={onCreateFolder}
        onSaveTabToFolder={onSaveTabToFolder}
      />
    </nav>
  )
}

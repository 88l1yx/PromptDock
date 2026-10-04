import { useState } from 'react'
import { Folder, FolderPlus } from 'lucide-react'
import type { DocumentFolder } from '@shared/types'

interface FolderShelfProps {
  folders: DocumentFolder[]
  activeFolderId: string | null
  onOpenFolder: (id: string) => void
  onCreateFolder: () => void
  onSaveTabToFolder: (tabId: string, folderId: string) => void
}

export function FolderShelf({
  folders,
  activeFolderId,
  onOpenFolder,
  onCreateFolder,
  onSaveTabToFolder
}: FolderShelfProps): React.JSX.Element {
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)

  const handleDrop = (event: React.DragEvent<HTMLButtonElement>, folderId: string): void => {
    event.preventDefault()
    const tabId =
      event.dataTransfer.getData('application/x-promptdock-tab') || event.dataTransfer.getData('text/plain')

    if (tabId) {
      onSaveTabToFolder(tabId, folderId)
    }

    setDragOverFolderId(null)
  }

  return (
    <section className="folder-shelf" aria-label="文档文件夹">
      <div className="folder-list">
        {folders.map((folder) => (
          <button
            className={`folder-button ${folder.id === activeFolderId ? 'is-active' : ''} ${
              folder.id === dragOverFolderId ? 'is-drag-over' : ''
            }`}
            type="button"
            key={folder.id}
            data-folder-id={folder.id}
            title={`${folder.name} · ${folder.documents.length} 个文档`}
            aria-label={folder.name}
            onClick={() => onOpenFolder(folder.id)}
            onDragEnter={() => setDragOverFolderId(folder.id)}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'copy'
              setDragOverFolderId(folder.id)
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDragOverFolderId(null)
              }
            }}
            onDrop={(event) => handleDrop(event, folder.id)}
          >
            <Folder size={23} strokeWidth={1.7} />
            <span className="folder-count">{folder.documents.length}</span>
          </button>
        ))}

        <button className="folder-create-button" type="button" title="新建文件夹" onClick={onCreateFolder}>
          <FolderPlus size={20} strokeWidth={1.7} />
        </button>
      </div>
    </section>
  )
}

import { useEffect, useState } from 'react'
import { FileText, FolderOpen, Trash2, X } from 'lucide-react'
import type { DocumentFolder } from '@shared/types'

interface FolderViewProps {
  folder: DocumentFolder
  onClose: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onOpenDocument: (folderId: string, documentId: string) => void
  onDeleteDocument: (folderId: string, documentId: string) => void
}

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
})

export function FolderView({
  folder,
  onClose,
  onRename,
  onDelete,
  onOpenDocument,
  onDeleteDocument
}: FolderViewProps): React.JSX.Element {
  const [draftName, setDraftName] = useState(folder.name)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setDraftName(folder.name)
    setConfirmDelete(false)
  }, [folder.id, folder.name])

  const commitName = (): void => {
    onRename(folder.id, draftName)
  }

  return (
    <section className="folder-view">
      <header className="folder-view-header">
        <div className="folder-view-title">
          <FolderOpen size={18} strokeWidth={1.8} />
          <input
            value={draftName}
            aria-label="文件夹名称"
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur()
              }
            }}
          />
          <span>{folder.documents.length}</span>
        </div>

        <div className="folder-view-actions">
          <button
            className={`icon-button ${confirmDelete ? 'is-danger' : ''}`}
            type="button"
            title={confirmDelete ? '再次点击确认删除文件夹' : '删除文件夹'}
            onClick={() => {
              if (confirmDelete) {
                onDelete(folder.id)
              } else {
                setConfirmDelete(true)
              }
            }}
          >
            <Trash2 size={14} />
          </button>
          <button className="icon-button" type="button" title="返回编辑器" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
      </header>

      <div className="document-list">
        {folder.documents.length === 0 ? (
          <div className="folder-empty">
            <FolderOpen size={28} strokeWidth={1.4} />
            <p>将上方标签拖到左侧文件夹图标</p>
          </div>
        ) : (
          folder.documents.map((document) => (
            <div className="document-row" key={document.id}>
              <button
                className="document-open-button"
                type="button"
                title={document.title}
                onClick={() => onOpenDocument(folder.id, document.id)}
              >
                <FileText size={15} strokeWidth={1.7} />
                <span className="document-title">{document.title}</span>
                <span className="document-meta">
                  {document.content.length.toLocaleString('zh-CN')} 字 · {dateFormatter.format(new Date(document.savedAt))}
                </span>
              </button>
              <button
                className="document-delete-button"
                type="button"
                title="从文件夹删除"
                onClick={() => onDeleteDocument(folder.id, document.id)}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import type { DocumentFolder, NoteTab, SavedDocument, WorkspaceState } from '../shared/types'

const DEFAULT_PROMPT = `[system]
你是一名严谨、耐心的专业助手。

[task]
请在这里写下你的完整需求。

[context]
补充背景、约束、参考资料和期望输出。
`

function createTab(index: number): NoteTab {
  const now = new Date().toISOString()

  return {
    id: randomUUID(),
    title: `Prompt ${String(index).padStart(2, '0')}`,
    content: index === 1 ? DEFAULT_PROMPT : '',
    updatedAt: now
  }
}

function createDefaultState(): WorkspaceState {
  const tab = createTab(1)

  return {
    version: 1,
    tabs: [tab],
    folders: [],
    activeTabId: tab.id,
    theme: 'dark',
    syntaxMode: 'prompt',
    pinExpanded: false
  }
}

function normalizeState(value: unknown): WorkspaceState {
  if (!value || typeof value !== 'object') {
    return createDefaultState()
  }

  const candidate = value as Partial<WorkspaceState>
  const sourceTabs = Array.isArray(candidate.tabs) ? candidate.tabs : []
  const tabs: NoteTab[] = sourceTabs
    .filter((tab): tab is NoteTab => Boolean(tab && typeof tab === 'object'))
    .map((tab, index) => ({
      id: typeof tab.id === 'string' && tab.id ? tab.id : randomUUID(),
      title: typeof tab.title === 'string' && tab.title ? tab.title : `Prompt ${String(index + 1).padStart(2, '0')}`,
      content: typeof tab.content === 'string' ? tab.content : '',
      updatedAt: typeof tab.updatedAt === 'string' ? tab.updatedAt : new Date().toISOString(),
      sourceDocumentId: typeof tab.sourceDocumentId === 'string' ? tab.sourceDocumentId : undefined,
      sourceFolderId: typeof tab.sourceFolderId === 'string' ? tab.sourceFolderId : undefined
    }))

  if (!tabs.length) {
    tabs.push(createTab(1))
  }

  const activeTabId = tabs.some((tab) => tab.id === candidate.activeTabId)
    ? (candidate.activeTabId as string)
    : tabs[0].id
  const sourceFolders = Array.isArray(candidate.folders) ? candidate.folders : []
  const folders: DocumentFolder[] = sourceFolders
    .filter((folder): folder is DocumentFolder => Boolean(folder && typeof folder === 'object'))
    .map((folder, folderIndex) => {
      const sourceDocuments = Array.isArray(folder.documents) ? folder.documents : []
      const documents: SavedDocument[] = sourceDocuments
        .filter((document): document is SavedDocument => Boolean(document && typeof document === 'object'))
        .map((document, documentIndex) => ({
          id: typeof document.id === 'string' && document.id ? document.id : randomUUID(),
          title:
            typeof document.title === 'string' && document.title
              ? document.title
              : `文档 ${String(documentIndex + 1).padStart(2, '0')}`,
          content: typeof document.content === 'string' ? document.content : '',
          savedAt: typeof document.savedAt === 'string' ? document.savedAt : new Date().toISOString(),
          sourceTabId: typeof document.sourceTabId === 'string' ? document.sourceTabId : undefined
        }))

      return {
        id: typeof folder.id === 'string' && folder.id ? folder.id : randomUUID(),
        name: typeof folder.name === 'string' && folder.name ? folder.name : `文件夹 ${folderIndex + 1}`,
        documents
      }
    })

  return {
    version: 1,
    tabs,
    folders,
    activeTabId,
    theme: candidate.theme === 'light' ? 'light' : 'dark',
    syntaxMode:
      candidate.syntaxMode === 'markdown' ||
      candidate.syntaxMode === 'text' ||
      candidate.syntaxMode === 'json' ||
      candidate.syntaxMode === 'javascript'
        ? candidate.syntaxMode
        : 'prompt',
    pinExpanded: Boolean(candidate.pinExpanded)
  }
}

export class WorkspaceStore {
  private readonly filePath = join(app.getPath('userData'), 'workspace.json')
  private state: WorkspaceState = createDefaultState()

  async load(): Promise<WorkspaceState> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      this.state = normalizeState(JSON.parse(raw))
    } catch {
      this.state = createDefaultState()
    }

    return this.getSnapshot()
  }

  getSnapshot(): WorkspaceState {
    return structuredClone(this.state)
  }

  async save(nextState: WorkspaceState): Promise<void> {
    this.state = normalizeState(nextState)
    await fs.mkdir(dirname(this.filePath), { recursive: true })

    const temporaryPath = `${this.filePath}.tmp`
    await fs.writeFile(temporaryPath, JSON.stringify(this.state, null, 2), 'utf8')

    try {
      await fs.rename(temporaryPath, this.filePath)
    } catch {
      await fs.copyFile(temporaryPath, this.filePath)
      await fs.rm(temporaryPath, { force: true })
    }
  }
}

import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import type { NoteTab, WorkspaceState } from '../shared/types'

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
      updatedAt: typeof tab.updatedAt === 'string' ? tab.updatedAt : new Date().toISOString()
    }))

  if (!tabs.length) {
    tabs.push(createTab(1))
  }

  const activeTabId = tabs.some((tab) => tab.id === candidate.activeTabId)
    ? (candidate.activeTabId as string)
    : tabs[0].id

  return {
    version: 1,
    tabs,
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

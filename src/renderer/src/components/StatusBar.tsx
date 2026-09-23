import type { SyntaxMode } from '@shared/types'

interface StatusBarProps {
  characterCount: number
  syntaxMode: SyntaxMode
  saveStatus: 'saved' | 'saving' | 'error'
  onSyntaxModeChange: (mode: SyntaxMode) => void
}

const statusText = {
  saved: '已保存',
  saving: '保存中',
  error: '保存失败'
}

export function StatusBar({
  characterCount,
  syntaxMode,
  saveStatus,
  onSyntaxModeChange
}: StatusBarProps): React.JSX.Element {
  return (
    <footer className="statusbar">
      <span>{characterCount.toLocaleString('zh-CN')} 字</span>
      <span className={`save-state is-${saveStatus}`}>{statusText[saveStatus]}</span>
      <span className="statusbar-spacer" />
      <label className="syntax-selector">
        <span className="sr-only">语法模式</span>
        <select value={syntaxMode} onChange={(event) => onSyntaxModeChange(event.target.value as SyntaxMode)}>
          <option value="prompt">Prompt</option>
          <option value="markdown">Markdown</option>
          <option value="text">纯文本</option>
          <option value="json">JSON</option>
          <option value="javascript">JavaScript</option>
        </select>
      </label>
    </footer>
  )
}

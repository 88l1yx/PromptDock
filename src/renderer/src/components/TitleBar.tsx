import { Moon, Pin, PinOff, Sun, X } from 'lucide-react'
import type { ThemeMode } from '@shared/types'

interface TitleBarProps {
  title: string
  theme: ThemeMode
  pinned: boolean
  onClose: () => void
  onTogglePin: () => void
  onToggleTheme: () => void
}

export function TitleBar({
  title,
  theme,
  pinned,
  onClose,
  onTogglePin,
  onToggleTheme
}: TitleBarProps): React.JSX.Element {
  return (
    <header className="titlebar">
      <div className="titlebar-controls">
        <button className="icon-button close-button" type="button" title="关闭窗口" onClick={onClose}>
          <X size={14} strokeWidth={2} />
        </button>
        <button
          className={`icon-button pin-button ${pinned ? 'is-active' : ''}`}
          type="button"
          title={pinned ? '允许贴边收起' : '固定展开'}
          onClick={onTogglePin}
        >
          {pinned ? <PinOff size={14} /> : <Pin size={14} />}
        </button>
      </div>

      <div className="titlebar-drag-region">
        <span className="titlebar-signature">[ ]</span>
        <span className="titlebar-title">{title}</span>
      </div>

      <div className="titlebar-controls">
        <button
          className="icon-button"
          type="button"
          title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </header>
  )
}

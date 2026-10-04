import { Check, LoaderCircle, Moon, Pin, PinOff, Save, Sun, X } from 'lucide-react'
import type { ThemeMode } from '@shared/types'

interface TitleBarProps {
  title: string
  theme: ThemeMode
  pinned: boolean
  windowSizeSaveStatus: 'idle' | 'saving' | 'saved' | 'error'
  onClose: () => void
  onSaveWindowSize: () => void
  onTogglePin: () => void
  onToggleTheme: () => void
}

export function TitleBar({
  title,
  theme,
  pinned,
  windowSizeSaveStatus,
  onClose,
  onSaveWindowSize,
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
          className={`icon-button save-window-button is-${windowSizeSaveStatus}`}
          type="button"
          title={
            windowSizeSaveStatus === 'saved'
              ? '窗口尺寸已保存'
              : windowSizeSaveStatus === 'error'
                ? '尺寸保存失败'
                : '保存当前窗口尺寸'
          }
          disabled={windowSizeSaveStatus === 'saving'}
          onClick={onSaveWindowSize}
        >
          {windowSizeSaveStatus === 'saving' ? (
            <LoaderCircle className="save-window-spinner" size={14} />
          ) : windowSizeSaveStatus === 'saved' ? (
            <Check size={14} strokeWidth={2.4} />
          ) : (
            <Save size={14} strokeWidth={1.9} />
          )}
        </button>
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

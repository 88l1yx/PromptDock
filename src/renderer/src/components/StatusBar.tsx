import { useEffect, useRef, useState } from 'react'
import { Check, ChevronUp } from 'lucide-react'
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

const syntaxOptions: Array<{ value: SyntaxMode; label: string }> = [
  { value: 'prompt', label: 'Prompt' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'text', label: '纯文本' },
  { value: 'json', label: 'JSON' },
  { value: 'javascript', label: 'JavaScript' }
]

export function StatusBar({
  characterCount,
  syntaxMode,
  saveStatus,
  onSyntaxModeChange
}: StatusBarProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const selectorRef = useRef<HTMLDivElement>(null)
  const currentLabel = syntaxOptions.find((option) => option.value === syntaxMode)?.label ?? 'Prompt'

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: PointerEvent): void => {
      if (!selectorRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <footer className="statusbar">
      <span>{characterCount.toLocaleString('zh-CN')} 字</span>
      <span className={`save-state is-${saveStatus}`}>{statusText[saveStatus]}</span>
      <span className="statusbar-spacer" />

      <div className="syntax-selector" ref={selectorRef}>
        <button
          className="syntax-trigger"
          type="button"
          title="选择语法模式"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span>{currentLabel}</span>
          <ChevronUp size={12} strokeWidth={2} />
        </button>

        {open && (
          <div className="syntax-menu" role="listbox" aria-label="语法模式">
            {syntaxOptions.map((option) => (
              <button
                className={`syntax-option ${option.value === syntaxMode ? 'is-active' : ''}`}
                type="button"
                role="option"
                aria-selected={option.value === syntaxMode}
                key={option.value}
                onClick={() => {
                  onSyntaxModeChange(option.value)
                  setOpen(false)
                }}
              >
                <span>{option.label}</span>
                {option.value === syntaxMode && <Check size={12} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </footer>
  )
}

import { Plus, X } from 'lucide-react'
import type { NoteTab } from '@shared/types'

interface TabRailProps {
  tabs: NoteTab[]
  activeTabId: string
  onAdd: () => void
  onSelect: (id: string) => void
  onClose: (id: string) => void
}

export function TabRail({ tabs, activeTabId, onAdd, onSelect, onClose }: TabRailProps): React.JSX.Element {
  return (
    <nav className="tab-rail" aria-label="文本页面">
      <button className="add-tab-button" type="button" title="新建文本页面" onClick={onAdd}>
        <Plus size={18} />
      </button>

      <div className="tab-list">
        {tabs.map((tab, index) => {
          const active = tab.id === activeTabId

          return (
            <div className={`tab-slot ${active ? 'is-active' : ''}`} key={tab.id}>
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
    </nav>
  )
}

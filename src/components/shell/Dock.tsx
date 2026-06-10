import { NodePanel } from '../sidebar/NodePanel'
import { ToolPanel } from '../sidebar/ToolPanel'
import { AssetPanel } from '../sidebar/AssetPanel'
import { HistoryPanel } from '../sidebar/HistoryPanel'
import { ConnectionHealthPanel } from '../sidebar/ConnectionHealthPanel'
import { ColumnResizeHandle } from '../common/ColumnResizeHandle'
import {
  useEditorShellStore,
  type DockDrawer,
  DOCK_DRAWER_WIDTH_MIN,
  DOCK_DRAWER_WIDTH_MAX,
} from '../../stores/editorShellStore'
import { useT } from '../../i18n'

const dockItems: { id: Exclude<DockDrawer, null>; icon: string; labelKey: string }[] = [
  { id: 'nodes', icon: '⊕', labelKey: 'sidebar.nodes' },
  { id: 'tools', icon: '🔧', labelKey: 'sidebar.tools' },
  { id: 'assets', icon: '📁', labelKey: 'sidebar.assets' },
  { id: 'history', icon: '🕐', labelKey: 'sidebar.history' },
  { id: 'health', icon: '⚠', labelKey: 'sidebar.health' },
]

export function Dock() {
  const t = useT()
  const openDrawer = useEditorShellStore((s) => s.openDrawer)
  const toggleDrawer = useEditorShellStore((s) => s.toggleDrawer)
  const dockDrawerWidth = useEditorShellStore((s) => s.dockDrawerWidth)
  const setDockDrawerWidth = useEditorShellStore((s) => s.setDockDrawerWidth)
  return (
    <div className="flex h-full shrink-0">
      <nav
        className="flex flex-col items-center py-3 gap-1 border-r border-[var(--studio-border)] bg-bg-tertiary"
        style={{ width: 'var(--space-dock)' }}
        aria-label="工具 Dock"
      >
        {dockItems.map((item) => {
          const active = openDrawer === item.id
          const label = t(item.labelKey)
          return (
            <button
              key={item.id}
              type="button"
              title={label}
              aria-label={label}
              aria-expanded={active}
              onClick={() => toggleDrawer(item.id)}
              className={`relative w-10 h-10 rounded-lg flex items-center justify-center text-lg transition ${
                active
                  ? 'bg-[var(--studio-accent-muted)] text-white'
                  : 'text-text-muted hover:bg-[var(--studio-surface-hover)] hover:text-white'
              }`}
            >
              {active && (
                <span
                  className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-[var(--studio-accent)]"
                  aria-hidden
                />
              )}
              {item.icon}
            </button>
          )
        })}
      </nav>

      {openDrawer && (
        <aside
          className="relative flex flex-col bg-bg-secondary border-r border-border overflow-hidden shrink-0 dock-expand-enter"
          style={{ width: dockDrawerWidth }}
        >
          <ColumnResizeHandle
            value={dockDrawerWidth}
            onChange={setDockDrawerWidth}
            min={DOCK_DRAWER_WIDTH_MIN}
            max={DOCK_DRAWER_WIDTH_MAX}
            ariaLabel="调整侧栏宽度"
          />
          <div className="px-3 py-2 border-b border-border text-xs font-medium text-text-primary shrink-0">
            {t(dockItems.find((d) => d.id === openDrawer)?.labelKey ?? 'sidebar.nodes')}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto lc-scroll [&>*]:min-h-full">
            {openDrawer === 'nodes' && <NodePanel />}
            {openDrawer === 'tools' && <ToolPanel />}
            {openDrawer === 'assets' && <AssetPanel />}
            {openDrawer === 'history' && <HistoryPanel />}
            {openDrawer === 'health' && <ConnectionHealthPanel />}
          </div>
        </aside>
      )}
    </div>
  )
}

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { NodePanel } from './NodePanel'
import { ToolPanel } from './ToolPanel'
import { AssetPanel } from './AssetPanel'
import { HistoryPanel } from './HistoryPanel'
import { AgentPanel } from '../panels/AgentPanel'
import { useAgentStore } from '../../stores/agentStore'
import { useT } from '../../i18n'
import { AccountMenu } from '../common/AccountMenu'

const tabDefs = [
  { id: 'nodes', icon: '➕', labelKey: 'sidebar.nodes' },
  { id: 'tools', icon: '🔧', labelKey: 'sidebar.tools' },
  { id: 'assets', icon: '📁', labelKey: 'sidebar.assets' },
  { id: 'history', icon: '📜', labelKey: 'sidebar.history' },
  { id: 'agent', icon: '🤖', labelKey: 'sidebar.agent' },
] as const

type TabId = (typeof tabDefs)[number]['id']

const MIN_PANEL_WIDTH = 180
const MAX_PANEL_WIDTH = 440
const DEFAULT_PANEL_WIDTH = 208
const SIDEBAR_WIDTH_KEY = 'lc-sidebar-width'

function readStoredWidth(): number {
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY)
    if (!raw) return DEFAULT_PANEL_WIDTH
    const n = parseInt(raw, 10)
    if (Number.isNaN(n)) return DEFAULT_PANEL_WIDTH
    return Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, n))
  } catch {
    return DEFAULT_PANEL_WIDTH
  }
}

interface SidebarProps {
  onBack?: () => void
  onOpenSettings?: () => void
  onToggleTheme?: () => void
  theme?: 'dark' | 'light'
}

export function Sidebar({ onBack, onOpenSettings, onToggleTheme, theme }: SidebarProps) {
  const t = useT()
  const [activeTab, setActiveTab] = useState<TabId>('nodes')
  const [isExpanded, setIsExpanded] = useState(true)
  const [panelWidth, setPanelWidth] = useState(readStoredWidth)
  const agentPanelOpen = useAgentStore((s) => s.panelOpen)
  const setAgentPanelOpen = useAgentStore((s) => s.setPanelOpen)

  useEffect(() => {
    if (agentPanelOpen) {
      setActiveTab('agent')
      setIsExpanded(true)
      setAgentPanelOpen(false)
    }
  }, [agentPanelOpen, setAgentPanelOpen])
  const widthResizeRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const panelWidthRef = useRef(panelWidth)
  panelWidthRef.current = panelWidth

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!widthResizeRef.current) return
      const delta = event.clientX - widthResizeRef.current.startX
      const next = Math.min(
        MAX_PANEL_WIDTH,
        Math.max(MIN_PANEL_WIDTH, widthResizeRef.current.startWidth + delta),
      )
      setPanelWidth(next)
    }

    const onMouseUp = () => {
      if (widthResizeRef.current) {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(panelWidthRef.current))
      }
      widthResizeRef.current = null
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const startWidthResize = (event: ReactMouseEvent) => {
    event.preventDefault()
    widthResizeRef.current = { startX: event.clientX, startWidth: panelWidth }
  }

  return (
    <div className="flex h-full shrink-0">
      <div className="w-14 bg-bg-tertiary flex flex-col items-center py-4 gap-3 border-r border-border">
        {tabDefs.map((tab) => {
          const label = t(tab.labelKey)
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id)
                setIsExpanded(true)
              }}
              className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center transition ${
                activeTab === tab.id
                  ? 'bg-accent text-white'
                  : 'text-text-muted hover:bg-bg-secondary'
              }`}
              title={label}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-[8px] mt-0.5">{label}</span>
            </button>
          )
        })}

        <div className="mt-auto pt-2 border-t border-border w-full flex justify-center">
          <AccountMenu />
        </div>

        {(onBack || onOpenSettings || onToggleTheme) && (
          <div className="flex flex-col items-center gap-2 pt-2 w-full">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-text-muted hover:bg-bg-secondary hover:text-white transition"
                title={t('app.backToProjects')}
                aria-label={t('app.backToProjects')}
              >
                ←
              </button>
            )}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-text-muted hover:bg-bg-secondary hover:text-white transition"
                title={theme === 'dark' ? t('app.toggleThemeLight') : t('app.toggleThemeDark')}
                aria-label={t('app.toggleTheme')}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            )}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-text-muted hover:bg-bg-secondary hover:text-white transition"
                title={t('app.settings')}
                aria-label={t('app.settings')}
              >
                ⚙️
              </button>
            )}
          </div>
        )}
      </div>

      {isExpanded && (
        <div
          className="relative bg-bg-secondary border-r border-border overflow-hidden flex flex-col shrink-0"
          style={{ width: panelWidth }}
        >
          <div className="flex items-center justify-between p-3 border-b border-border shrink-0">
            <span className="text-xs font-medium text-text-primary">
              {t(tabDefs.find((tab) => tab.id === activeTab)?.labelKey ?? 'sidebar.nodes')}
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-text-muted hover:text-white text-sm"
              aria-label={t('sidebar.close')}
            >
              ✕
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto lc-scroll">
            {activeTab === 'nodes' && <NodePanel />}
            {activeTab === 'tools' && <ToolPanel />}
            {activeTab === 'assets' && <AssetPanel />}
            {activeTab === 'history' && <HistoryPanel />}
            {activeTab === 'agent' && <AgentPanel />}
          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="调整侧边栏宽度"
            title="拖动调整宽度"
            onMouseDown={startWidthResize}
            className="absolute top-0 right-0 w-1.5 h-full cursor-ew-resize hover:bg-accent/30 active:bg-accent/50 transition-colors"
          />
        </div>
      )}
    </div>
  )
}

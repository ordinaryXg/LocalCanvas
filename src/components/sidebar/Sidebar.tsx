import { useState } from 'react'
import { NodePanel } from './NodePanel'
import { ToolPanel } from './ToolPanel'
import { AssetPanel } from './AssetPanel'
import { HistoryPanel } from './HistoryPanel'

const tabs = [
  { id: 'nodes', icon: '➕', label: '节点' },
  { id: 'tools', icon: '🔧', label: '工具' },
  { id: 'assets', icon: '📁', label: '资产' },
  { id: 'history', icon: '📜', label: '历史' },
] as const

type TabId = (typeof tabs)[number]['id']

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<TabId>('nodes')
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="flex h-full shrink-0">
      <div className="w-14 bg-bg-tertiary flex flex-col items-center py-4 gap-3 border-r border-border">
        {tabs.map((tab) => (
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
            title={tab.label}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[8px] mt-0.5">{tab.label}</span>
          </button>
        ))}
      </div>

      {isExpanded && (
        <div className="w-52 bg-bg-secondary border-r border-border overflow-y-auto">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <span className="text-xs font-medium text-text-primary">
              {tabs.find((t) => t.id === activeTab)?.label}
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-text-muted hover:text-white text-sm"
            >
              ✕
            </button>
          </div>

          {activeTab === 'nodes' && <NodePanel />}
          {activeTab === 'tools' && <ToolPanel />}
          {activeTab === 'assets' && <AssetPanel />}
          {activeTab === 'history' && <HistoryPanel />}
        </div>
      )}
    </div>
  )
}

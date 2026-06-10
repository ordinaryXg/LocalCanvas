import type { ModelCapabilityProfile } from '../../types/capability'
import { ModelCapabilityBadges } from './ModelCapabilityBadges'
import type { ConnectedModel } from './modelSettingsHelpers'

interface ConnectedModelCardProps {
  entry: ConnectedModel
  profile: ModelCapabilityProfile | null
  configured: boolean
  expanded: boolean
  isDefault: boolean
  testing: boolean
  probing: boolean
  showProbe: boolean
  onTest: () => void
  onProbe: () => void
  onSetDefault: () => void
  onToggleExpand: () => void
  onRemove: () => void
  onUpdateModelId: (model: string) => void
  onUpdateApiKey: (apiKey: string) => void
}

export function ConnectedModelCard({
  entry,
  profile,
  configured,
  expanded,
  isDefault,
  testing,
  probing,
  showProbe,
  onTest,
  onProbe,
  onSetDefault,
  onToggleExpand,
  onRemove,
  onUpdateModelId,
  onUpdateApiKey,
}: ConnectedModelCardProps) {
  const { kind, model } = entry

  return (
    <div className="bg-bg-tertiary rounded-lg p-4 border border-border/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-text-primary">{model.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-secondary text-text-muted">
              {kind.toUpperCase()}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                configured ? 'bg-success/15 text-success' : 'bg-amber-500/15 text-amber-200'
              }`}
            >
              {configured ? '已配置 Key' : '未配置 Key'}
            </span>
            {isDefault && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent">默认</span>
            )}
          </div>
          <div className="mt-2">
            <ModelCapabilityBadges profile={profile} compact />
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            type="button"
            onClick={onTest}
            disabled={testing}
            className="text-[10px] px-2 py-1 bg-accent/20 text-accent rounded hover:bg-accent/40 disabled:opacity-50"
          >
            {testing ? '测试中' : '测试'}
          </button>
          {showProbe && (
            <button
              type="button"
              onClick={onProbe}
              disabled={probing || !configured}
              className="text-[10px] px-2 py-1 bg-amber-500/15 text-amber-200 rounded hover:bg-amber-500/25 disabled:opacity-50"
              title="发送最小请求并缓存能力，虚线边可升级为实线"
            >
              {probing ? '验证中' : '验证能力'}
            </button>
          )}
          {!isDefault && (
            <button
              type="button"
              onClick={onSetDefault}
              className="text-[10px] px-2 py-1 text-text-muted hover:text-white"
            >
              设为默认
            </button>
          )}
          <button
            type="button"
            onClick={onToggleExpand}
            className="text-[10px] px-2 py-1 text-text-muted hover:text-white"
          >
            {expanded ? '收起' : '详情'}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-[10px] px-2 py-1 text-danger/80 hover:text-danger"
          >
            删除
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
          <ModelCapabilityBadges profile={profile} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="text-text-muted truncate">
              Provider: <span className="text-text-primary">{model.provider}</span>
            </div>
            <div className="text-text-muted truncate">
              Endpoint: <span className="text-text-primary font-mono text-[10px]">{model.endpoint}</span>
            </div>
            {'model' in model && (
              <div className="sm:col-span-2">
                <label className="text-[10px] text-text-muted block mb-1">API Model ID</label>
                {kind === 'image' || kind === 'video' ? (
                  <input
                    type="text"
                    value={model.model}
                    onChange={(e) => onUpdateModelId(e.target.value)}
                    className="w-full bg-bg-secondary text-text-primary px-2 py-1 rounded outline-none text-xs font-mono"
                  />
                ) : (
                  <span className="text-text-primary font-mono text-[10px]">{model.model}</span>
                )}
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="text-[10px] text-text-muted block mb-1">API Key</label>
              <input
                type="password"
                value={model.api_key ?? ''}
                onChange={(e) => onUpdateApiKey(e.target.value)}
                placeholder="也可使用环境变量"
                className="w-full bg-bg-secondary text-text-primary px-2 py-1 rounded outline-none text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

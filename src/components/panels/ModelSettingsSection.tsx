import { useEffect, useMemo, useState } from 'react'
import type {
  AppConfig,
  ImageModelConfig,
  LLMModelConfig,
  TTSModelConfig,
  VideoModelConfig,
} from '../../types/config'
import type { ModelKind } from '../../types/capability'
import { getPresetsForTab, presetToModelConfig, type ModelPreset } from '../../constants/modelPresets'
import {
  getCatalogVersion,
  hasApiKey,
  profileNeedsProbe,
  resolveProfileForConfig,
} from '../../capabilities/profile-display'
import { ModelCapabilityBadges } from './ModelCapabilityBadges'
import type { DiscoveredModelEntry } from '../../types/capability-sync'
import { hydrateProbedProfileCache } from '../../capabilities/load-probed-profiles'
import { setProbedProfile } from '../../capabilities/probed-profile-cache'
import { useCanvasStore } from '../../stores/canvasStore'

type ModelEntry = ImageModelConfig | VideoModelConfig | LLMModelConfig | TTSModelConfig
type KindFilter = 'all' | ModelKind

interface ConnectedModel {
  kind: ModelKind
  model: ModelEntry
}

interface ModelSettingsSectionProps {
  config: AppConfig
  setConfig: (config: AppConfig) => void
  onStatus: (msg: { ok: boolean; text: string }) => void
}

function listConnectedModels(config: AppConfig, filter: KindFilter): ConnectedModel[] {
  const items: ConnectedModel[] = []
  const push = (kind: ModelKind, models: ModelEntry[]) => {
    for (const model of models) items.push({ kind, model })
  }
  if (filter === 'all' || filter === 'llm') push('llm', config.llm_models)
  if (filter === 'all' || filter === 'image') push('image', config.image_models)
  if (filter === 'all' || filter === 'video') push('video', config.video_models)
  if (filter === 'all' || filter === 'tts') push('tts', config.tts_models)
  return items
}

function defaultKeyForKind(kind: ModelKind): keyof AppConfig['settings'] {
  if (kind === 'image') return 'default_image_model'
  if (kind === 'video') return 'default_video_model'
  if (kind === 'tts') return 'default_tts'
  return 'default_llm'
}

const FILTER_OPTIONS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'llm', label: 'LLM' },
  { id: 'image', label: '图像' },
  { id: 'video', label: '视频' },
  { id: 'tts', label: '语音' },
]

export function ModelSettingsSection({ config, setConfig, onStatus }: ModelSettingsSectionProps) {
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [testing, setTesting] = useState<string | null>(null)
  const [probing, setProbing] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addKind, setAddKind] = useState<ModelKind>('llm')
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const [newApiKey, setNewApiKey] = useState('')
  const [catalogSyncedAt, setCatalogSyncedAt] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [discovered, setDiscovered] = useState<DiscoveredModelEntry[]>([])
  const [unmappedCount, setUnmappedCount] = useState(0)

  const connected = useMemo(() => listConnectedModels(config, kindFilter), [config, kindFilter])

  const refreshCacheStatus = async () => {
    await hydrateProbedProfileCache()
    const status = await window.api.capability.getStatus()
    setCatalogSyncedAt(status.lastSyncedAt)
    setUnmappedCount(status.unmappedCount)
    setDiscovered(status.discovered)
  }

  useEffect(() => {
    void refreshCacheStatus()
  }, [])

  const profileOptionsForModel = (kind: ModelKind, model: ModelEntry) => ({
    customConfig: model.custom_config,
    endpoint: model.endpoint,
    displayName: model.name,
    provider: model.provider,
  })

  const filteredDiscovered = useMemo(() => {
    if (kindFilter === 'all') return discovered
    return discovered.filter((d) => d.kind === kindFilter)
  }, [discovered, kindFilter])

  const existingIds = useMemo(() => {
    const ids = new Set<string>()
    for (const m of config.llm_models) ids.add(m.id)
    for (const m of config.image_models) ids.add(m.id)
    for (const m of config.video_models) ids.add(m.id)
    for (const m of config.tts_models) ids.add(m.id)
    return ids
  }, [config])

  const effectiveAddKind: ModelKind = kindFilter === 'all' ? addKind : kindFilter

  const availablePresets = useMemo((): ModelPreset[] => {
    const tab =
      effectiveAddKind === 'llm'
        ? 'llm'
        : effectiveAddKind === 'image'
          ? 'image'
          : effectiveAddKind === 'video'
            ? 'video'
            : 'tts'
    return getPresetsForTab(tab).filter((p) => !existingIds.has(p.id))
  }, [effectiveAddKind, existingIds])

  const selectedPreset = availablePresets.find((p) => p.id === selectedPresetId)
  const selectedProfile = selectedPreset
    ? resolveProfileForConfig(selectedPreset.id, selectedPreset.model, selectedPreset.kind)
    : null

  const removeModel = (kind: ModelKind, id: string) => {
    if (kind === 'image') {
      setConfig({ ...config, image_models: config.image_models.filter((m) => m.id !== id) })
    } else if (kind === 'video') {
      setConfig({ ...config, video_models: config.video_models.filter((m) => m.id !== id) })
    } else if (kind === 'llm') {
      setConfig({ ...config, llm_models: config.llm_models.filter((m) => m.id !== id) })
    } else {
      setConfig({ ...config, tts_models: config.tts_models.filter((m) => m.id !== id) })
    }
  }

  const setDefault = (kind: ModelKind, id: string) => {
    const key = defaultKeyForKind(kind)
    setConfig({
      ...config,
      settings: { ...config.settings, [key]: id },
    })
    onStatus({ ok: true, text: '已设为默认模型' })
  }

  const updateApiKey = (kind: ModelKind, id: string, apiKey: string) => {
    const patch = (models: ModelEntry[]) =>
      models.map((m) => (m.id === id ? { ...m, api_key: apiKey } : m))
    if (kind === 'image') setConfig({ ...config, image_models: patch(config.image_models) as ImageModelConfig[] })
    else if (kind === 'video') setConfig({ ...config, video_models: patch(config.video_models) as VideoModelConfig[] })
    else if (kind === 'llm') setConfig({ ...config, llm_models: patch(config.llm_models) as LLMModelConfig[] })
    else setConfig({ ...config, tts_models: patch(config.tts_models) as TTSModelConfig[] })
  }

  const updateModelId = (kind: ModelKind, id: string, model: string) => {
    if (kind === 'image') {
      setConfig({
        ...config,
        image_models: config.image_models.map((m) => (m.id === id ? { ...m, model } : m)),
      })
    } else if (kind === 'video') {
      setConfig({
        ...config,
        video_models: config.video_models.map((m) => (m.id === id ? { ...m, model } : m)),
      })
    }
  }

  const handleTest = async (entry: ConnectedModel) => {
    setTesting(entry.model.id)
    const result = await window.api.config.testConnection(
      entry.model.provider,
      entry.model.endpoint,
      entry.model.api_key,
    )
    setTesting(null)
    onStatus({ ok: result.ok, text: result.message })
  }

  const refreshCanvasEdgeCompat = () => {
    const { nodes, edges, viewport, loadProject } = useCanvasStore.getState()
    if (nodes.length > 0) {
      loadProject(nodes, edges, viewport)
    }
  }

  const handleProbe = async (entry: ConnectedModel) => {
    setProbing(entry.model.id)
    try {
      const result = await window.api.capability.probe({
        kind: entry.kind,
        configId: entry.model.id,
      })
      if (result.ok) {
        setProbedProfile(entry.model.id, result.profile)
        refreshCanvasEdgeCompat()
      }
      onStatus({ ok: result.ok, text: result.message })
    } catch (err) {
      onStatus({
        ok: false,
        text: err instanceof Error ? err.message : '验证能力失败',
      })
    } finally {
      setProbing(null)
    }
  }

  const handleAddPreset = () => {
    const preset = availablePresets.find((p) => p.id === selectedPresetId)
    if (!preset) return
    const entry = presetToModelConfig(preset, newApiKey)
    if (preset.kind === 'image') {
      setConfig({ ...config, image_models: [...config.image_models, entry as ImageModelConfig] })
    } else if (preset.kind === 'video') {
      setConfig({ ...config, video_models: [...config.video_models, entry as VideoModelConfig] })
    } else if (preset.kind === 'llm') {
      setConfig({ ...config, llm_models: [...config.llm_models, entry as LLMModelConfig] })
    } else {
      setConfig({ ...config, tts_models: [...config.tts_models, entry as TTSModelConfig] })
    }
    setShowAddForm(false)
    setSelectedPresetId('')
    setNewApiKey('')
    onStatus({ ok: true, text: `已添加 ${preset.name}` })
  }

  const findExistingApiKey = (provider: string): string => {
    const all = [
      ...config.llm_models,
      ...config.image_models,
      ...config.video_models,
      ...config.tts_models,
    ]
    return all.find((m) => m.provider === provider && m.api_key?.trim())?.api_key ?? ''
  }

  const handleSyncCatalog = async () => {
    setSyncing(true)
    try {
      const result = await window.api.capability.sync()
      setCatalogSyncedAt(result.syncedAt)
      setDiscovered(result.discovered)
      setUnmappedCount(result.discovered.filter((d) => !d.in_catalog).length)
      const okCount = result.sources.filter((s) => s.ok).length
      const failCount = result.sources.length - okCount
      if (result.sources.length === 0) {
        onStatus({
          ok: true,
          text: `内置目录 v${result.catalogVersion}；请为已接入模型配置 API Key 后再同步厂商列表`,
        })
      } else if (failCount === 0) {
        onStatus({
          ok: true,
          text: `已同步 ${okCount} 个厂商，发现 ${result.discovered.length} 个可添加模型`,
        })
      } else {
        onStatus({
          ok: okCount > 0,
          text: `同步完成：${okCount} 成功，${failCount} 失败；发现 ${result.discovered.length} 个可添加模型`,
        })
      }
    } catch (err) {
      onStatus({ ok: false, text: err instanceof Error ? err.message : '同步失败' })
    } finally {
      setSyncing(false)
    }
  }

  const handleAddDiscovered = (entry: DiscoveredModelEntry) => {
    if (!entry.preset_id || !entry.has_preset) return
    const tab =
      entry.kind === 'llm'
        ? 'llm'
        : entry.kind === 'image'
          ? 'image'
          : entry.kind === 'video'
            ? 'video'
            : 'tts'
    const preset = getPresetsForTab(tab).find((p) => p.id === entry.preset_id)
    if (!preset) return
    const apiKey = findExistingApiKey(preset.provider)
    const modelEntry = presetToModelConfig(preset, apiKey)
    if (entry.kind === 'image') {
      setConfig({ ...config, image_models: [...config.image_models, modelEntry as ImageModelConfig] })
    } else if (entry.kind === 'video') {
      setConfig({ ...config, video_models: [...config.video_models, modelEntry as VideoModelConfig] })
    } else if (entry.kind === 'llm') {
      setConfig({ ...config, llm_models: [...config.llm_models, modelEntry as LLMModelConfig] })
    } else {
      setConfig({ ...config, tts_models: [...config.tts_models, modelEntry as TTSModelConfig] })
    }
    setDiscovered((prev) => prev.filter((d) => d.model_id !== entry.model_id))
    onStatus({ ok: true, text: `已添加 ${preset.name}` })
  }

  const isDefault = (kind: ModelKind, id: string) => {
    const key = defaultKeyForKind(kind)
    return config.settings[key] === id
  }

  return (
    <div className="flex gap-4 min-h-[360px]">
      <aside className="w-28 shrink-0 space-y-1">
        <p className="text-[10px] text-text-muted uppercase tracking-wide mb-2">筛选</p>
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setKindFilter(opt.id)}
            className={`w-full text-left px-2 py-1.5 rounded text-xs transition ${
              kindFilter === opt.id
                ? 'bg-accent/20 text-accent'
                : 'text-text-muted hover:text-white hover:bg-bg-tertiary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </aside>

      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[10px] text-text-muted">
            内置目录 v{getCatalogVersion()}
            {catalogSyncedAt
              ? ` · 厂商同步 ${new Date(catalogSyncedAt).toLocaleString()}`
              : ' · 尚未同步厂商列表'}
            {unmappedCount > 0 && ` · ${unmappedCount} 个未入库模型`}
          </div>
          <button
            type="button"
            onClick={() => void handleSyncCatalog()}
            disabled={syncing}
            className="text-xs px-2 py-1 rounded border border-border text-text-muted hover:text-white hover:border-accent/40 disabled:opacity-50"
          >
            {syncing ? '同步中…' : '↻ 同步厂商列表'}
          </button>
        </div>

        {filteredDiscovered.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
            <p className="text-xs font-medium text-amber-200">
              账户已开通 · 尚未添加（{filteredDiscovered.length}）
            </p>
            {filteredDiscovered.map((entry) => (
              <div
                key={entry.model_id}
                className="flex items-center justify-between gap-2 text-xs bg-bg-tertiary/80 rounded px-2 py-1.5"
              >
                <div className="min-w-0">
                  <span className="text-text-primary font-mono text-[10px]">{entry.model_id}</span>
                  <span className="text-text-muted ml-2">{entry.kind.toUpperCase()}</span>
                  {!entry.in_catalog && (
                    <span className="text-amber-300 ml-2">待下一版本入库</span>
                  )}
                </div>
                {entry.has_preset && entry.in_catalog ? (
                  <button
                    type="button"
                    onClick={() => handleAddDiscovered(entry)}
                    className="shrink-0 text-[10px] px-2 py-1 rounded bg-accent/20 text-accent hover:bg-accent/40"
                  >
                    添加
                  </button>
                ) : (
                  <span className="text-[10px] text-text-muted shrink-0">暂不可添加</span>
                )}
              </div>
            ))}
          </div>
        )}

        {connected.length === 0 && (
          <p className="text-text-muted text-sm text-center py-8 border border-dashed border-border rounded-lg">
            暂无已接入模型，请从目录添加
          </p>
        )}

        {connected.map(({ kind, model }) => {
          const profile = resolveProfileForConfig(
            model.id,
            'model' in model ? model.model : undefined,
            kind,
            profileOptionsForModel(kind, model),
          )
          const configured = hasApiKey(model.api_key)
          const expanded = expandedId === `${kind}:${model.id}`
          const showProbe =
            model.provider === 'custom' || profileNeedsProbe(profile)

          return (
            <div key={`${kind}-${model.id}`} className="bg-bg-tertiary rounded-lg p-4 border border-border/60">
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
                    {isDefault(kind, model.id) && (
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
                    onClick={() => void handleTest({ kind, model })}
                    disabled={testing === model.id}
                    className="text-[10px] px-2 py-1 bg-accent/20 text-accent rounded hover:bg-accent/40 disabled:opacity-50"
                  >
                    {testing === model.id ? '测试中' : '测试'}
                  </button>
                  {showProbe && (
                    <button
                      type="button"
                      onClick={() => void handleProbe({ kind, model })}
                      disabled={probing === model.id || !configured}
                      className="text-[10px] px-2 py-1 bg-amber-500/15 text-amber-200 rounded hover:bg-amber-500/25 disabled:opacity-50"
                      title="发送最小请求并缓存能力，虚线边可升级为实线"
                    >
                      {probing === model.id ? '验证中' : '验证能力'}
                    </button>
                  )}
                  {!isDefault(kind, model.id) && (
                    <button
                      type="button"
                      onClick={() => setDefault(kind, model.id)}
                      className="text-[10px] px-2 py-1 text-text-muted hover:text-white"
                    >
                      设为默认
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : `${kind}:${model.id}`)}
                    className="text-[10px] px-2 py-1 text-text-muted hover:text-white"
                  >
                    {expanded ? '收起' : '详情'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeModel(kind, model.id)}
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
                            onChange={(e) => updateModelId(kind, model.id, e.target.value)}
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
                        onChange={(e) => updateApiKey(kind, model.id, e.target.value)}
                        placeholder="也可使用环境变量"
                        className="w-full bg-bg-secondary text-text-primary px-2 py-1 rounded outline-none text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {showAddForm ? (
          <div className="bg-bg-tertiary rounded-lg p-4 border border-accent/30 space-y-3">
            <p className="text-sm font-medium text-text-primary">从目录添加模型</p>
            {kindFilter === 'all' && (
              <select
                value={addKind}
                onChange={(e) => {
                  setAddKind(e.target.value as ModelKind)
                  setSelectedPresetId('')
                }}
                className="w-full bg-bg-secondary text-text-primary px-3 py-2 rounded outline-none text-sm"
              >
                <option value="llm">LLM</option>
                <option value="image">图像</option>
                <option value="video">视频</option>
                <option value="tts">语音</option>
              </select>
            )}
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="w-full bg-bg-secondary text-text-primary px-3 py-2 rounded outline-none text-sm"
            >
              <option value="">选择模型…</option>
              {availablePresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {selectedProfile && (
              <div className="p-2 rounded bg-bg-secondary/80">
                <ModelCapabilityBadges profile={selectedProfile} compact />
              </div>
            )}
            <input
              type="password"
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
              placeholder="API Key（可选，也可使用环境变量）"
              className="w-full bg-bg-secondary text-text-primary px-3 py-2 rounded outline-none text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!selectedPresetId}
                onClick={handleAddPreset}
                className="text-xs px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50"
              >
                确认添加
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setSelectedPresetId('')
                  setNewApiKey('')
                }}
                className="text-xs px-4 py-2 text-text-muted hover:text-white"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          availablePresets.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (kindFilter !== 'all') setAddKind(kindFilter)
                setShowAddForm(true)
              }}
              className="w-full py-2.5 text-sm text-accent border border-dashed border-accent/40 rounded-lg hover:bg-accent/10 transition"
            >
              + 从目录添加模型
            </button>
          )
        )}
      </div>
    </div>
  )
}

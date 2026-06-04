import { useState, useEffect } from 'react'
import type {
  AppConfig,
  ImageModelConfig,
  VideoModelConfig,
  LLMModelConfig,
  TTSModelConfig,
} from '../../types/config'
import { getPresetsForTab, presetToModelConfig, type ModelPreset } from '../../constants/modelPresets'

type ModelEntry = ImageModelConfig | VideoModelConfig | LLMModelConfig | TTSModelConfig
type TabId = 'image' | 'video' | 'llm' | 'tts' | 'settings'

interface SettingsPanelProps {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('image')
  const [testing, setTesting] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const [newApiKey, setNewApiKey] = useState('')
  const [ffmpegDownloading, setFfmpegDownloading] = useState(false)
  const [ffmpegDownloadPct, setFfmpegDownloadPct] = useState(0)

  useEffect(() => {
    void window.api.config.read().then(setConfig)
  }, [])

  if (!config) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="text-text-muted text-sm">加载配置中...</div>
      </div>
    )
  }

  const models: ModelEntry[] =
    activeTab === 'image'
      ? config.image_models
      : activeTab === 'video'
        ? config.video_models
        : activeTab === 'llm'
          ? config.llm_models
          : activeTab === 'tts'
            ? config.tts_models
            : []

  const handleTest = async (model: ModelEntry) => {
    setTesting(model.id)
    setStatusMsg(null)
    const result = await window.api.config.testConnection(model.provider, model.endpoint, model.api_key)
    setTesting(null)
    setStatusMsg({ ok: result.ok, text: result.message })
  }

  const handleSave = async () => {
    const settings = { ...config.settings }
    if (!settings.default_image_model && config.image_models.length > 0) {
      settings.default_image_model = config.image_models[0].id
    }
    if (!settings.default_video_model && config.video_models.length > 0) {
      settings.default_video_model = config.video_models[0].id
    }
    if (!settings.default_llm && config.llm_models.length > 0) {
      settings.default_llm = config.llm_models[0].id
    }
    if (!settings.default_tts && config.tts_models.length > 0) {
      settings.default_tts = config.tts_models[0].id
    }
    const toSave = { ...config, settings }
    await window.api.config.write(toSave)
    onClose()
  }

  const removeModel = (id: string) => {
    if (activeTab === 'image') {
      setConfig({
        ...config,
        image_models: config.image_models.filter((m) => m.id !== id),
      })
    } else if (activeTab === 'video') {
      setConfig({
        ...config,
        video_models: config.video_models.filter((m) => m.id !== id),
      })
    } else if (activeTab === 'llm') {
      setConfig({
        ...config,
        llm_models: config.llm_models.filter((m) => m.id !== id),
      })
    } else if (activeTab === 'tts') {
      setConfig({
        ...config,
        tts_models: config.tts_models.filter((m) => m.id !== id),
      })
    }
  }

  const availablePresets = (): ModelPreset[] => {
    if (activeTab === 'settings') return []
    const presets = getPresetsForTab(activeTab)
    const existingIds =
      activeTab === 'image'
        ? config.image_models.map((m) => m.id)
        : activeTab === 'video'
          ? config.video_models.map((m) => m.id)
          : activeTab === 'llm'
            ? config.llm_models.map((m) => m.id)
            : config.tts_models.map((m) => m.id)
    return presets.filter((p) => !existingIds.includes(p.id))
  }

  const updateVideoModelField = (id: string, field: 'model' | 'api_key' | 'name', value: string) => {
    setConfig({
      ...config,
      video_models: config.video_models.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    })
  }

  const updateImageModelField = (id: string, field: 'model' | 'api_key', value: string) => {
    setConfig({
      ...config,
      image_models: config.image_models.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    })
  }

  const handleAddPreset = () => {
    const preset = availablePresets().find((p) => p.id === selectedPresetId)
    if (!preset || !config) return

    const entry = presetToModelConfig(preset, newApiKey)

    if (activeTab === 'image') {
      setConfig({ ...config, image_models: [...config.image_models, entry as ImageModelConfig] })
    } else if (activeTab === 'video') {
      setConfig({ ...config, video_models: [...config.video_models, entry as VideoModelConfig] })
    } else if (activeTab === 'llm') {
      setConfig({ ...config, llm_models: [...config.llm_models, entry as LLMModelConfig] })
    } else if (activeTab === 'tts') {
      setConfig({ ...config, tts_models: [...config.tts_models, entry as TTSModelConfig] })
    }

    setShowAddForm(false)
    setSelectedPresetId('')
    setNewApiKey('')
    setStatusMsg({ ok: true, text: `已添加 ${preset.name}` })
  }

  const tabLabels: Record<TabId, string> = {
    image: '🖼️ 图像',
    video: '🎥 视频',
    llm: '🤖 LLM',
    tts: '🎵 TTS',
    settings: '⚙️ 设置',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[700px] max-h-[80vh] bg-bg-secondary rounded-xl border border-border overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-text-primary">⚙️ 模型配置</h2>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-white">
            ✕
          </button>
        </div>

        <div className="flex border-b border-border shrink-0">
          {(['image', 'video', 'llm', 'tts', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab)
                setStatusMsg(null)
              }}
              className={`flex-1 px-4 py-2 text-sm transition ${
                activeTab === tab
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {statusMsg && (
            <div
              className={`mb-3 text-sm p-3 rounded ${
                statusMsg.ok ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
              }`}
            >
              {statusMsg.ok ? '✅' : '❌'} {statusMsg.text}
            </div>
          )}

          {activeTab !== 'settings' ? (
            <div className="space-y-3">
              {models.length === 0 && (
                <p className="text-text-muted text-sm text-center py-6">
                  暂无模型，请通过首次引导或手动添加
                </p>
              )}
              {models.map((model) => (
                <div key={model.id} className="bg-bg-tertiary rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-text-primary text-sm font-medium">{model.name}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleTest(model)}
                        disabled={testing === model.id}
                        className="text-xs px-3 py-1 bg-accent/20 text-accent rounded hover:bg-accent/40 transition disabled:opacity-50"
                      >
                        {testing === model.id ? '测试中...' : '测试连接'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeModel(model.id)}
                        className="text-xs px-3 py-1 bg-danger/20 text-danger rounded hover:bg-danger/40 transition"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-text-muted">
                    <div>
                      Provider: <span className="text-text-primary">{model.provider}</span>
                    </div>
                    <div className="truncate">
                      Endpoint: <span className="text-text-primary">{model.endpoint}</span>
                    </div>
                    {'model' in model && activeTab === 'video' ? (
                      <div className="col-span-2">
                        <label className="block mb-1">API Model ID</label>
                        <input
                          type="text"
                          value={model.model}
                          onChange={(e) => updateVideoModelField(model.id, 'model', e.target.value)}
                          placeholder="doubao-seedance-1-0-pro-fast-251015"
                          className="w-full bg-bg-secondary text-text-primary px-2 py-1 rounded outline-none text-xs font-mono"
                        />
                      </div>
                    ) : 'model' in model && activeTab === 'image' ? (
                      <div className="col-span-2">
                        <label className="block mb-1">API Model ID</label>
                        <input
                          type="text"
                          value={model.model}
                          onChange={(e) => updateImageModelField(model.id, 'model', e.target.value)}
                          placeholder="doubao-seedream-4-5-251128"
                          className="w-full bg-bg-secondary text-text-primary px-2 py-1 rounded outline-none text-xs font-mono"
                        />
                      </div>
                    ) : (
                      'model' in model && (
                        <div>
                          Model: <span className="text-text-primary">{model.model}</span>
                        </div>
                      )
                    )}
                    <div className={activeTab === 'video' || activeTab === 'image' ? 'col-span-2' : ''}>
                      API Key:{' '}
                      {activeTab === 'video' ? (
                        <input
                          type="password"
                          value={model.api_key ?? ''}
                          onChange={(e) => updateVideoModelField(model.id, 'api_key', e.target.value)}
                          placeholder="ARK_API_KEY"
                          className="w-full mt-1 bg-bg-secondary text-text-primary px-2 py-1 rounded outline-none text-xs"
                        />
                      ) : activeTab === 'image' ? (
                        <input
                          type="password"
                          value={model.api_key ?? ''}
                          onChange={(e) => updateImageModelField(model.id, 'api_key', e.target.value)}
                          placeholder="ARK_API_KEY"
                          className="w-full mt-1 bg-bg-secondary text-text-primary px-2 py-1 rounded outline-none text-xs"
                        />
                      ) : (
                        <span className="text-text-primary">
                          {model.api_key ? '●●●●●●' : '未设置'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {showAddForm ? (
                <div className="bg-bg-tertiary rounded-lg p-4 border border-accent/30 space-y-3">
                  <p className="text-sm text-text-primary font-medium">添加模型</p>
                  <select
                    value={selectedPresetId}
                    onChange={(e) => setSelectedPresetId(e.target.value)}
                    className="w-full bg-bg-secondary text-text-primary px-3 py-2 rounded outline-none text-sm"
                  >
                    <option value="">选择预设...</option>
                    {availablePresets().map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
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
                availablePresets().length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="w-full py-2 text-sm text-accent border border-dashed border-accent/40 rounded-lg hover:bg-accent/10 transition"
                  >
                    + 添加模型
                  </button>
                )
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-muted block mb-1">默认图像模型</label>
                <select
                  value={config.settings.default_image_model}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      settings: { ...config.settings, default_image_model: e.target.value },
                    })
                  }
                  className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded outline-none text-sm"
                >
                  <option value="">未选择</option>
                  {config.image_models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">默认视频模型</label>
                <select
                  value={config.settings.default_video_model}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      settings: { ...config.settings, default_video_model: e.target.value },
                    })
                  }
                  className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded outline-none text-sm"
                >
                  <option value="">未选择</option>
                  {config.video_models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">默认 LLM</label>
                <select
                  value={config.settings.default_llm}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      settings: { ...config.settings, default_llm: e.target.value },
                    })
                  }
                  className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded outline-none text-sm"
                >
                  <option value="">未选择</option>
                  {config.llm_models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">默认 TTS</label>
                <select
                  value={config.settings.default_tts}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      settings: { ...config.settings, default_tts: e.target.value },
                    })
                  }
                  className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded outline-none text-sm"
                >
                  <option value="">未选择</option>
                  {config.tts_models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">最大并发任务</label>
                <input
                  type="number"
                  value={config.settings.max_concurrent_tasks}
                  min={1}
                  max={10}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      settings: {
                        ...config.settings,
                        max_concurrent_tasks: parseInt(e.target.value, 10) || 1,
                      },
                    })
                  }
                  className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">输出目录</label>
                <input
                  type="text"
                  value={config.settings.output_dir}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      settings: { ...config.settings, output_dir: e.target.value },
                    })
                  }
                  className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">FFmpeg 路径</label>
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    value={config.settings.ffmpeg_path}
                    placeholder="留空则自动检测系统 PATH"
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        settings: { ...config.settings, ffmpeg_path: e.target.value },
                      })
                    }
                    className="flex-1 min-w-[180px] bg-bg-tertiary text-text-primary px-3 py-2 rounded outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void window.api.ffmpeg
                        .detect(config.settings.ffmpeg_path || undefined)
                        .then((r) =>
                          setStatusMsg({ ok: true, text: `FFmpeg: ${r.path}` }),
                        )
                        .catch((err) =>
                          setStatusMsg({
                            ok: false,
                            text: err instanceof Error ? err.message : '检测失败',
                          }),
                        )
                    }}
                    className="px-3 py-2 text-xs bg-bg-tertiary rounded hover:bg-bg-primary text-text-secondary"
                  >
                    检测
                  </button>
                  <button
                    type="button"
                    disabled={ffmpegDownloading}
                    onClick={() => {
                      void (async () => {
                        setFfmpegDownloading(true)
                        setFfmpegDownloadPct(0)
                        const unsub = window.api.on('ffmpeg:progress', (...args: unknown[]) => {
                          const payload = args[0] as { percentage?: number }
                          if (typeof payload?.percentage === 'number') {
                            setFfmpegDownloadPct(payload.percentage)
                          }
                        })
                        try {
                          const result = await window.api.ffmpeg.download()
                          setConfig((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  settings: { ...prev.settings, ffmpeg_path: result.path },
                                }
                              : prev,
                          )
                          setStatusMsg({ ok: true, text: `已下载并配置 FFmpeg: ${result.path}` })
                        } catch (err) {
                          setStatusMsg({
                            ok: false,
                            text: err instanceof Error ? err.message : '下载失败',
                          })
                        } finally {
                          unsub()
                          setFfmpegDownloading(false)
                        }
                      })()
                    }}
                    className="px-3 py-2 text-xs bg-accent/20 text-accent rounded hover:bg-accent/30 disabled:opacity-50"
                  >
                    {ffmpegDownloading ? `下载中 ${ffmpegDownloadPct}%` : '下载安装'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-text-muted hover:text-white">
            取消
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            className="px-6 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  )
}

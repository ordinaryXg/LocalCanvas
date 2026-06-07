import { useState, useEffect } from 'react'
import type { AppConfig } from '../../types/config'
import { useI18nStore, useT, type Locale } from '../../i18n'
import { ModelSettingsSection } from './ModelSettingsSection'
import {
  isEditorShell,
  setEditorShellEnabled,
  isLegacyLayoutForced,
  setLegacyLayoutEnabled,
} from '../../constants/editorFeatures'

type TabId = 'models' | 'settings'

interface SettingsPanelProps {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const t = useT()
  const { locale, setLocale } = useI18nStore()
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('models')
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [ffmpegDownloading, setFfmpegDownloading] = useState(false)
  const [ffmpegDownloadPct, setFfmpegDownloadPct] = useState(0)
  const [agentSkills, setAgentSkills] = useState<Array<{ id: string; name: string; description: string }>>([])
  const [disabledSkills, setDisabledSkills] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('lc-agent-disabled-skills')
      return raw ? (JSON.parse(raw) as string[]) : []
    } catch {
      return []
    }
  })
  const [useEditorShellUi, setUseEditorShellUi] = useState(() => isEditorShell())
  const [useLegacyLayout, setUseLegacyLayout] = useState(() => isLegacyLayoutForced())

  useEffect(() => {
    void window.api.config.read().then(setConfig)
    void window.api.agent.listSkills().then((r) => setAgentSkills(r.skills))
  }, [])

  const toggleAgentSkill = (skillId: string) => {
    setDisabledSkills((prev) => {
      const next = prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
      localStorage.setItem('lc-agent-disabled-skills', JSON.stringify(next))
      return next
    })
  }

  if (!config) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="text-text-muted text-sm">加载配置中...</div>
      </div>
    )
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[820px] max-h-[85vh] bg-bg-secondary rounded-xl border border-border overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-text-primary">⚙️ 模型与能力</h2>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-white">
            ✕
          </button>
        </div>

        <div className="flex border-b border-border shrink-0">
          {(
            [
              { id: 'models' as const, label: '🧩 已接入模型' },
              { id: 'settings' as const, label: '⚙️ 应用设置' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id)
                setStatusMsg(null)
              }}
              className={`flex-1 px-4 py-2.5 text-sm transition ${
                activeTab === tab.id
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto lc-scroll flex-1 min-h-0">
          {statusMsg && (
            <div
              className={`mb-3 text-sm p-3 rounded ${
                statusMsg.ok ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
              }`}
            >
              {statusMsg.ok ? '✅' : '❌'} {statusMsg.text}
            </div>
          )}

          {activeTab === 'models' ? (
            <ModelSettingsSection
              config={config}
              setConfig={setConfig}
              onStatus={setStatusMsg}
            />
          ) : (
            <div className="space-y-4 max-w-lg">
              <div className="rounded-lg border border-[var(--studio-border)] p-3 space-y-3">
                <h3 className="text-sm font-medium text-text-primary">界面（v8）</h3>
                <label className="flex items-center gap-2 text-xs text-text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useEditorShellUi && !useLegacyLayout}
                    onChange={(e) => {
                      const on = e.target.checked
                      setUseEditorShellUi(on)
                      setEditorShellEnabled(on)
                      if (on) {
                        setUseLegacyLayout(false)
                        setLegacyLayoutEnabled(false)
                      }
                    }}
                  />
                  使用新版编辑器壳层（Dock + 检查器）
                </label>
                <label className="flex items-center gap-2 text-xs text-text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useLegacyLayout}
                    onChange={(e) => {
                      const on = e.target.checked
                      setUseLegacyLayout(on)
                      setLegacyLayoutEnabled(on)
                      if (on) setUseEditorShellUi(false)
                    }}
                  />
                  使用经典布局（v6 侧栏，需重启编辑器视图）
                </label>
                <button
                  type="button"
                  className="text-xs text-[var(--studio-accent)] hover:underline"
                  onClick={() => {
                    try {
                      localStorage.removeItem('editorCoachDone')
                    } catch {
                      /* ignore */
                    }
                    setStatusMsg({ ok: true, text: '已重置引导，下次打开新版编辑器将显示' })
                  }}
                >
                  重置界面引导
                </button>
                <p className="text-[10px] text-text-muted">
                  切换布局后请关闭并重新打开项目以生效。
                </p>
              </div>
              <p className="text-xs text-text-muted">
                默认模型也可在「已接入模型」卡片上点击「设为默认」。
              </p>
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
              {agentSkills.length > 0 && (
                <div>
                  <label className="text-xs text-text-muted block mb-2">{t('settings.agentSkills')}</label>
                  <div className="space-y-2">
                    {agentSkills.map((skill) => (
                      <label
                        key={skill.id}
                        className="flex items-start gap-2 text-xs text-text-primary cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={!disabledSkills.includes(skill.id)}
                          onChange={() => toggleAgentSkill(skill.id)}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="font-medium">{skill.name}</span>
                          <span className="text-text-muted block text-[10px]">{skill.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs text-text-muted block mb-1">{t('settings.language')}</label>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as Locale)}
                  className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded outline-none text-sm"
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="en-US">English</option>
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
                        .then((r) => setStatusMsg({ ok: true, text: `FFmpeg: ${r.path}` }))
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
              <div>
                <label className="text-xs text-text-muted block mb-1">Demucs 路径（人声分离，可选）</label>
                <input
                  type="text"
                  value={config.settings.demucs_path ?? ''}
                  placeholder="留空则尝试 demucs 命令，否则使用 FFmpeg 简易分离"
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      settings: { ...config.settings, demucs_path: e.target.value },
                    })
                  }
                  className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded outline-none text-sm"
                />
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

import { useState, useEffect, useRef, useCallback } from 'react'
import type { AppConfig } from '../../types/config'
import { getCatalogVersion } from '../../capabilities/profile-display'
import { useT } from '../../i18n'
import { ModelSettingsSection } from './ModelSettingsSection'
import { SettingsDefaultsTab } from './SettingsDefaultsTab'
import { SettingsToolsTab } from './SettingsToolsTab'
import { SettingsGeneralTab } from './SettingsGeneralTab'
import { SettingsShortcutsTab } from './SettingsShortcutsTab'

type TabId = 'models' | 'defaults' | 'tools' | 'general' | 'shortcuts'

interface SettingsPanelProps {
  onClose: () => void
}

const CONFIG_PERSIST_DEBOUNCE_MS = 400
const CATALOG_SEEN_KEY = 'lc-seen-catalog-version'
const catalogVersion = getCatalogVersion()

function prepareConfigForSave(config: AppConfig): AppConfig {
  const pickDefault = (models: { id: string }[], current: string | undefined) => {
    if (current && models.some((m) => m.id === current)) return current
    return models[0]?.id ?? ''
  }

  return {
    ...config,
    settings: {
      ...config.settings,
      default_image_model: pickDefault(config.image_models, config.settings.default_image_model),
      default_video_model: pickDefault(config.video_models, config.settings.default_video_model),
      default_llm: pickDefault(config.llm_models, config.settings.default_llm),
      default_tts: pickDefault(config.tts_models, config.settings.default_tts),
    },
  }
}

const TABS: { id: TabId; labelKey: string; fallback: string }[] = [
  { id: 'models', labelKey: 'settings.tabModels', fallback: '🧩 已接入模型' },
  { id: 'defaults', labelKey: 'settings.tabDefaults', fallback: '⭐ 默认模型' },
  { id: 'tools', labelKey: 'settings.tabTools', fallback: '🛠 媒体与路径' },
  { id: 'general', labelKey: 'settings.tabGeneral', fallback: '🌐 界面' },
  { id: 'shortcuts', labelKey: 'settings.tabShortcuts', fallback: '⌨️ 快捷键' },
]

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const t = useT()
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('models')
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [ffmpegDownloading, setFfmpegDownloading] = useState(false)
  const [ffmpegDownloadPct, setFfmpegDownloadPct] = useState(0)
  const [catalogNotice, setCatalogNotice] = useState(false)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestConfigRef = useRef<AppConfig | null>(null)

  const flushConfig = useCallback(async (cfg: AppConfig) => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current)
      persistTimerRef.current = null
    }
    const toSave = prepareConfigForSave(cfg)
    latestConfigRef.current = toSave
    await window.api.config.write(toSave)
  }, [])

  const schedulePersist = useCallback(
    (cfg: AppConfig) => {
      latestConfigRef.current = cfg
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null
        void flushConfig(cfg).catch((err) => {
          console.error('config auto-save failed', err)
        })
      }, CONFIG_PERSIST_DEBOUNCE_MS)
    },
    [flushConfig],
  )

  const updateConfig = useCallback(
    (next: AppConfig | ((prev: AppConfig) => AppConfig)) => {
      setConfig((prev) => {
        if (!prev) return prev
        const resolved = typeof next === 'function' ? next(prev) : next
        schedulePersist(resolved)
        return resolved
      })
    },
    [schedulePersist],
  )

  useEffect(() => {
    void window.api.config.read().then(setConfig)
    const seen = Number(localStorage.getItem(CATALOG_SEEN_KEY) ?? String(catalogVersion))
    setCatalogNotice(seen < catalogVersion)
  }, [])

  useEffect(() => {
    if (config) latestConfigRef.current = config
  }, [config])

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current)
        persistTimerRef.current = null
      }
      const cfg = latestConfigRef.current
      if (cfg) {
        void window.api.config.write(prepareConfigForSave(cfg))
      }
    }
  }, [])

  const handleClose = () => {
    void (async () => {
      if (config) await flushConfig(config)
      onClose()
    })()
  }

  const dismissCatalogNotice = () => {
    localStorage.setItem(CATALOG_SEEN_KEY, String(catalogVersion))
    setCatalogNotice(false)
  }

  const handleFfmpegDownload = () => {
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
        updateConfig((prev) =>
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
  }

  if (!config) {
    return (
      <div className="flex flex-1 items-center justify-center text-text-muted text-sm">
        加载配置中...
      </div>
    )
  }

  const handleSave = async () => {
    await flushConfig(config)
    onClose()
  }

  const tabLabel = (tab: (typeof TABS)[number]) =>
    t(tab.labelKey) === tab.labelKey ? tab.fallback : t(tab.labelKey)

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-bg-secondary">
      <div className="shrink-0 px-6 py-2 border-b border-border bg-bg-secondary">
        <p className="text-xs text-text-muted">
          {t('settings.catalogVersion').replace('{{version}}', String(catalogVersion))}
        </p>
      </div>

      <div
        className="shrink-0 flex border-b border-border overflow-x-auto bg-bg-secondary"
        role="tablist"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => {
              setActiveTab(tab.id)
              setStatusMsg(null)
            }}
            className={`shrink-0 px-4 py-2.5 text-sm transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted hover:text-white'
            }`}
          >
            {tabLabel(tab)}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto lc-scroll">
        <div className="max-w-4xl mx-auto w-full p-6">
          {catalogNotice && (
            <div className="mb-4 text-sm p-3 rounded bg-accent/10 text-text-primary flex items-start justify-between gap-3">
              <span>{t('settings.catalogUpdated')}</span>
              <button
                type="button"
                onClick={dismissCatalogNotice}
                className="shrink-0 text-xs text-accent hover:underline"
              >
                {t('settings.catalogDismiss')}
              </button>
            </div>
          )}
          {statusMsg?.text && (
            <div
              className={`mb-4 text-sm p-3 rounded ${
                statusMsg.ok ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
              }`}
            >
              {statusMsg.ok ? '✅' : '❌'} {statusMsg.text}
            </div>
          )}

          {activeTab === 'models' && (
            <ModelSettingsSection config={config} setConfig={updateConfig} onStatus={setStatusMsg} />
          )}
          {activeTab === 'defaults' && (
            <SettingsDefaultsTab config={config} updateConfig={updateConfig} />
          )}
          {activeTab === 'tools' && (
            <SettingsToolsTab
              config={config}
              updateConfig={updateConfig}
              ffmpegDownloading={ffmpegDownloading}
              ffmpegDownloadPct={ffmpegDownloadPct}
              onFfmpegDownload={handleFfmpegDownload}
              onStatus={setStatusMsg}
            />
          )}
          {activeTab === 'general' && <SettingsGeneralTab onStatus={setStatusMsg} />}
          {activeTab === 'shortcuts' && <SettingsShortcutsTab />}
        </div>
      </div>

      <footer className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-border bg-bg-secondary">
        <p className="text-[10px] text-text-muted">{t('settings.autoSaveHint')}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm text-text-muted hover:text-white"
          >
            {t('settings.close')}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            className="px-6 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover"
          >
            {t('settings.saveAndClose')}
          </button>
        </div>
      </footer>
    </div>
  )
}

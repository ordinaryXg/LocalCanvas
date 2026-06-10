import type { AppConfig } from '../../types/config'
import { useT } from '../../i18n'

interface SettingsToolsTabProps {
  config: AppConfig
  updateConfig: (next: AppConfig | ((prev: AppConfig) => AppConfig)) => void
  ffmpegDownloading: boolean
  ffmpegDownloadPct: number
  onFfmpegDownload: () => void
  onStatus: (msg: { ok: boolean; text: string }) => void
}

export function SettingsToolsTab({
  config,
  updateConfig,
  ffmpegDownloading,
  ffmpegDownloadPct,
  onFfmpegDownload,
  onStatus,
}: SettingsToolsTabProps) {
  const t = useT()

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <label className="text-xs text-text-muted block mb-1">最大并发任务</label>
        <input
          type="number"
          value={config.settings.max_concurrent_tasks}
          min={1}
          max={10}
          onChange={(e) =>
            updateConfig({
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
            updateConfig({
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
              updateConfig({
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
                .then((r) => onStatus({ ok: true, text: `FFmpeg: ${r.path}` }))
                .catch((err) =>
                  onStatus({
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
            onClick={onFfmpegDownload}
            className="px-3 py-2 text-xs bg-accent/20 text-accent rounded hover:bg-accent/30 disabled:opacity-50"
          >
            {ffmpegDownloading ? `下载中 ${ffmpegDownloadPct}%` : '下载安装'}
          </button>
        </div>
      </div>
      <div>
        <label className="text-xs text-text-muted block mb-1">{t('settings.vocalSeparationEndpoint')}</label>
        <input
          type="text"
          value={config.settings.vocal_separation_endpoint ?? ''}
          placeholder="https://api.example.com/v1/separate"
          onChange={(e) =>
            updateConfig({
              ...config,
              settings: { ...config.settings, vocal_separation_endpoint: e.target.value },
            })
          }
          className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded outline-none text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-text-muted block mb-1">{t('settings.vocalSeparationApiKey')}</label>
        <input
          type="password"
          value={config.settings.vocal_separation_api_key ?? ''}
          placeholder="可选"
          onChange={(e) =>
            updateConfig({
              ...config,
              settings: { ...config.settings, vocal_separation_api_key: e.target.value },
            })
          }
          className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded outline-none text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-text-muted block mb-1">Demucs 路径（人声分离，可选）</label>
        <input
          type="text"
          value={config.settings.demucs_path ?? ''}
          placeholder="留空则尝试 demucs 命令，否则使用 FFmpeg 简易分离"
          onChange={(e) =>
            updateConfig({
              ...config,
              settings: { ...config.settings, demucs_path: e.target.value },
            })
          }
          className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded outline-none text-sm"
        />
      </div>
    </div>
  )
}

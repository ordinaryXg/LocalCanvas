import type { AppConfig } from '../../types/config'
import { useT } from '../../i18n'

interface SettingsDefaultsTabProps {
  config: AppConfig
  updateConfig: (next: AppConfig) => void
}

export function SettingsDefaultsTab({ config, updateConfig }: SettingsDefaultsTabProps) {
  const t = useT()

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-xs text-text-muted">
        新建节点或未指定模型时使用以下默认项；也可在「已接入模型」卡片上点击「设为默认」。
      </p>
      <div>
        <label className="text-xs text-text-muted block mb-1">默认图像模型</label>
        <select
          value={config.settings.default_image_model}
          onChange={(e) =>
            updateConfig({
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
            updateConfig({
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
        <label className="text-xs text-text-muted block mb-1">{t('settings.defaultLlm')}</label>
        <select
          value={config.settings.default_llm}
          onChange={(e) =>
            updateConfig({
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
            updateConfig({
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
    </div>
  )
}

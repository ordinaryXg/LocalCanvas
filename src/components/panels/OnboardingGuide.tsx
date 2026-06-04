import { useState, type MouseEvent } from 'react'
import { LLM_PRESETS, VIDEO_PRESETS } from '../../constants/modelPresets'
import { DEFAULT_SEEDANCE_VIDEO_MODEL } from '../../constants/seedance'

interface OnboardingGuideProps {
  onComplete: () => void
}

export function OnboardingGuide({ onComplete }: OnboardingGuideProps) {
  const [step, setStep] = useState(0)
  const [presetId, setPresetId] = useState(LLM_PRESETS[0].id)
  const [apiKey, setApiKey] = useState('')
  const [arkApiKey, setArkApiKey] = useState('')
  const [testing, setTesting] = useState(false)
  const [testingVideo, setTestingVideo] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [videoTestResult, setVideoTestResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  )

  const preset = LLM_PRESETS.find((p) => p.id === presetId) ?? LLM_PRESETS[0]
  const seedancePreset = VIDEO_PRESETS[0]
  const arkConsoleUrl =
    'https://console.volcengine.com/ark/region:ark+cn-beijing/apikey'

  const openArkConsole = (e: MouseEvent) => {
    e.preventDefault()
    void window.api.app.openExternal(arkConsoleUrl)
  }

  const handleTestLlm = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await window.api.config.testConnection(preset.provider, preset.endpoint, apiKey)
    setTestResult(result)
    setTesting(false)
  }

  const handleTestVideo = async () => {
    setTestingVideo(true)
    setVideoTestResult(null)
    const result = await window.api.config.testConnection(
      'volcengine_seedance',
      seedancePreset.endpoint,
      arkApiKey,
    )
    setVideoTestResult(result)
    setTestingVideo(false)
  }

  const handleComplete = async () => {
    const config = await window.api.config.read()

    const llmExists = config.llm_models.some((m) => m.id === preset.id)
    if (!llmExists) {
      config.llm_models.push({
        id: preset.id,
        name: preset.name,
        provider: preset.provider,
        endpoint: preset.endpoint,
        api_key: apiKey,
        model: preset.model,
        max_tokens: 4096,
      })
    } else {
      config.llm_models = config.llm_models.map((m) =>
        m.id === preset.id ? { ...m, api_key: apiKey } : m,
      )
    }
    config.settings.default_llm = preset.id

    if (arkApiKey.trim()) {
      for (const vp of VIDEO_PRESETS) {
        const exists = config.video_models.some((m) => m.id === vp.id)
        const entry = {
          id: vp.id,
          name: vp.name,
          provider: 'volcengine_seedance' as const,
          endpoint: vp.endpoint,
          poll_endpoint: vp.poll_endpoint,
          model: vp.model,
          api_key: arkApiKey,
          max_duration: 15,
          supported_resolutions: ['480p', '720p', '1080p', '2K'],
          default_params: vp.default_params,
        }
        if (exists) {
          config.video_models = config.video_models.map((m) => (m.id === vp.id ? entry : m))
        } else {
          config.video_models.push(entry)
        }
      }
      config.settings.default_video_model = DEFAULT_SEEDANCE_VIDEO_MODEL.id
    }

    config.settings.onboarding_completed = true
    await window.api.config.write(config)
    onComplete()
  }

  const handleSkip = async () => {
    const config = await window.api.config.read()
    config.settings.onboarding_completed = true
    await window.api.config.write(config)
    onComplete()
  }

  const steps = [
    {
      title: '欢迎使用 LocalCanvas！',
      content: (
        <div className="text-center">
          <div className="text-6xl mb-4">🎬</div>
          <p className="text-text-secondary mb-6 leading-relaxed">
            LocalCanvas 以 <strong className="text-rose-400">Doubao Seedance</strong>{' '}
            为核心视频引擎，当前默认使用 <strong>1.0 Pro Fast</strong> 进行测试，配合 DeepSeek / GLM 等 LLM 完成脚本到成片的全链路创作。
          </p>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="bg-accent text-white px-8 py-3 rounded-lg hover:bg-accent-hover transition"
          >
            开始配置 →
          </button>
        </div>
      ),
    },
    {
      title: '配置 API Key',
      content: (
        <div>
          <p className="text-text-secondary mb-4 text-sm">
            配置 LLM 用于脚本/文本生成；配置火山方舟 ARK Key 用于 Seedance 视频生成。
          </p>
          <div className="space-y-4">
            <div className="p-3 rounded-lg border border-border bg-bg-secondary/50">
              <p className="text-xs text-text-muted mb-2">LLM（脚本 / 文本）</p>
              <select
                value={presetId}
                onChange={(e) => {
                  setPresetId(e.target.value)
                  setTestResult(null)
                }}
                className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded-lg outline-none text-sm mb-2"
              >
                {LLM_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`${preset.name} API Key`}
                className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded-lg outline-none text-sm mb-2"
              />
              <button
                type="button"
                onClick={() => void handleTestLlm()}
                disabled={testing || !apiKey.trim()}
                className="w-full text-xs bg-accent/20 text-accent py-1.5 rounded hover:bg-accent/40 disabled:opacity-50"
              >
                {testing ? '测试中...' : '测试 LLM 连接'}
              </button>
              {testResult && (
                <p className={`text-xs mt-2 ${testResult.ok ? 'text-success' : 'text-danger'}`}>
                  {testResult.ok ? '✅' : '❌'} {testResult.message}
                </p>
              )}
            </div>

            <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/5">
              <p className="text-xs text-rose-400 mb-1 font-medium">Seedance 视频（1.0 Pro Fast 测试）</p>
              <p className="text-[10px] text-text-muted mb-2">
                在{' '}
                <button
                  type="button"
                  onClick={openArkConsole}
                  className="text-accent underline hover:text-accent-hover"
                >
                  火山方舟控制台
                </button>{' '}
                获取 ARK API Key
              </p>
              <input
                type="password"
                value={arkApiKey}
                onChange={(e) => setArkApiKey(e.target.value)}
                placeholder="ARK API Key（环境变量 ARK_API_KEY）"
                className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded-lg outline-none text-sm mb-2"
              />
              <button
                type="button"
                onClick={() => void handleTestVideo()}
                disabled={testingVideo || !arkApiKey.trim()}
                className="w-full text-xs bg-rose-500/20 text-rose-400 py-1.5 rounded hover:bg-rose-500/30 disabled:opacity-50"
              >
                {testingVideo ? '测试中...' : '测试 Seedance 连接'}
              </button>
              {videoTestResult && (
                <p
                  className={`text-xs mt-2 ${videoTestResult.ok ? 'text-success' : 'text-danger'}`}
                >
                  {videoTestResult.ok ? '✅' : '❌'} {videoTestResult.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button type="button" onClick={() => setStep(0)} className="px-4 py-2 text-sm text-text-muted">
              ← 上一步
            </button>
            <button
              type="button"
              onClick={() => void handleComplete()}
              disabled={!apiKey.trim()}
              className="flex-1 bg-accent text-white py-2 rounded-lg hover:bg-accent-hover transition disabled:opacity-50"
            >
              完成配置 →
            </button>
            <button
              type="button"
              onClick={() => void handleSkip()}
              className="px-4 py-2 text-sm text-text-muted hover:text-text-secondary"
            >
              跳过
            </button>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg-primary">
      <div className="w-[520px] px-6 max-h-[90vh] overflow-y-auto">
        <h1 className="text-2xl font-bold text-text-primary mb-6">{steps[step].title}</h1>
        {steps[step].content}
      </div>
    </div>
  )
}

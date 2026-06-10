import type { AppConfig } from '../types/config'
import { getLlmModelConfig, resolveDefaultLlmModelId } from './configResolve'
import { hasUsableApiKey } from './apiKey'
import { selectModelForRequirement } from '../capabilities/agent-model-select'

export type ReadinessRowStatus = 'ok' | 'warn' | 'error' | 'optional'

export interface ReadinessRow {
  id: string
  label: string
  value: string
  status: ReadinessRowStatus
  settingsTab: 'defaults' | 'models' | 'agent'
  focus?: string
}

export interface AgentReadiness {
  ready: boolean
  rows: ReadinessRow[]
}

function modelName(config: AppConfig, id: string | undefined, fallback: string): string {
  if (!id) return fallback
  const all = [...config.llm_models, ...config.image_models, ...config.video_models]
  return all.find((m) => m.id === id)?.name ?? id
}

export function evaluateAgentReadiness(config: AppConfig): AgentReadiness {
  const rows: ReadinessRow[] = []
  const llmId = resolveDefaultLlmModelId(config)
  const llmConfig = llmId ? getLlmModelConfig(config, llmId) : undefined
  const llmOk = !!llmId && hasUsableApiKey(llmConfig?.api_key)

  rows.push({
    id: 'default_llm',
    label: 'defaultLlm',
    value: llmId ? modelName(config, llmId, llmId) : '—',
    status: llmOk ? 'ok' : 'error',
    settingsTab: 'defaults',
    focus: 'default_llm',
  })

  const imageId = config.settings.default_image_model
  rows.push({
    id: 'default_image',
    label: 'defaultImage',
    value: imageId ? modelName(config, imageId, imageId) : '—',
    status: imageId && config.image_models.some((m) => m.id === imageId) ? 'ok' : 'optional',
    settingsTab: 'defaults',
    focus: 'default_image',
  })

  const videoId = config.settings.default_video_model
  rows.push({
    id: 'default_video',
    label: 'defaultVideo',
    value: videoId ? modelName(config, videoId, videoId) : '—',
    status: videoId && config.video_models.some((m) => m.id === videoId) ? 'ok' : 'warn',
    settingsTab: 'defaults',
    focus: 'default_video',
  })

  const lastFrameModel = selectModelForRequirement(config, {
    kind: 'video',
    needsLastFrame: true,
  })
  rows.push({
    id: 'last_frame',
    label: 'lastFrame',
    value: lastFrameModel?.name ?? '—',
    status: lastFrameModel ? 'ok' : 'warn',
    settingsTab: 'models',
  })

  const blocking = rows.some((r) => r.status === 'error')
  return { ready: !blocking && llmOk, rows }
}

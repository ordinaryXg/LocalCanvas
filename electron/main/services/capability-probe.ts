import axios from 'axios'
import { readConfig } from './config'
import { logger } from './logger'
import { CapabilityProbeRepository } from '../repositories/capability-probe-repository'
import { inferProfileFromCustomConfig } from '../../../src/capabilities/custom-infer'
import { cacheTtlMs } from '../../../src/capabilities/l2-sync'
import type {
  AppConfig,
  ImageModelConfig,
  LLMModelConfig,
  TTSModelConfig,
  VideoModelConfig,
} from '../../../src/types/config'
import type { ModelCapabilityProfile, ModelKind } from '../../../src/types/capability'
import type {
  CapabilityProbeRequest,
  CapabilityProbeResult,
  ProbedProfileEntry,
} from '../../../src/types/capability-sync'

const repo = new CapabilityProbeRepository()

type ModelEntry = ImageModelConfig | VideoModelConfig | LLMModelConfig | TTSModelConfig

function findModelEntry(
  config: AppConfig,
  kind: ModelKind,
  configId: string,
): ModelEntry | undefined {
  if (kind === 'image') return config.image_models.find((m) => m.id === configId)
  if (kind === 'video') return config.video_models.find((m) => m.id === configId)
  if (kind === 'llm') return config.llm_models.find((m) => m.id === configId)
  return config.tts_models.find((m) => m.id === configId)
}

function baseProfile(entry: ModelEntry, kind: ModelKind): ModelCapabilityProfile {
  return inferProfileFromCustomConfig(kind, entry.id, entry.name, {
    customConfig: entry.custom_config,
    endpoint: entry.endpoint,
    apiModel: 'model' in entry ? entry.model : undefined,
  })
}

function buildProbeBody(
  entry: ModelEntry,
  kind: ModelKind,
): { url: string; method: string; body?: Record<string, unknown>; headers: Record<string, string> } {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (entry.api_key?.trim()) {
    headers.Authorization = `Bearer ${entry.api_key}`
  }
  if (entry.custom_config?.headers) {
    Object.assign(headers, entry.custom_config.headers)
  }

  if (entry.custom_config) {
    const template = JSON.parse(
      JSON.stringify(entry.custom_config.request_template),
    ) as Record<string, unknown>
    const replaceVars = (obj: unknown): unknown => {
      if (typeof obj === 'string') {
        return obj.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
          const probeValues: Record<string, string | number> = {
            prompt: 'probe',
            text: 'probe',
            system_prompt: '',
            negative_prompt: '',
            width: 512,
            height: 512,
            duration: 2,
            max_tokens: 1,
            temperature: 0,
            seed: 1,
            model: 'model' in entry ? entry.model : 'probe',
          }
          return probeValues[key] !== undefined ? String(probeValues[key]) : 'probe'
        })
      }
      if (Array.isArray(obj)) return obj.map(replaceVars)
      if (typeof obj === 'object' && obj !== null) {
        const out: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(obj)) out[k] = replaceVars(v)
        return out
      }
      return obj
    }
    return {
      url: entry.custom_config.endpoint,
      method: entry.custom_config.method,
      body: replaceVars(template) as Record<string, unknown>,
      headers,
    }
  }

  if (kind === 'llm') {
    return {
      url: entry.endpoint,
      method: 'POST',
      body: {
        model: entry.model,
        messages: [{ role: 'user', content: 'probe' }],
        max_tokens: 1,
      },
      headers,
    }
  }

  return {
    url: entry.endpoint,
    method: 'GET',
    headers,
  }
}

function upgradeProfile(profile: ModelCapabilityProfile): ModelCapabilityProfile {
  return {
    ...profile,
    confidence: 'documented',
    source: 'probe',
  }
}

export async function probeModelCapability(
  request: CapabilityProbeRequest,
): Promise<CapabilityProbeResult> {
  const config = await readConfig()
  const entry = findModelEntry(config, request.kind, request.configId)
  if (!entry) {
    return {
      ok: false,
      probedAt: new Date().toISOString(),
      profile: baseProfile(
        {
          id: request.configId,
          name: request.configId,
          provider: 'custom',
          endpoint: '',
          model: '',
        } as ModelEntry,
        request.kind,
      ),
      message: '未找到该模型配置',
    }
  }

  if (!entry.api_key?.trim()) {
    return {
      ok: false,
      probedAt: new Date().toISOString(),
      profile: baseProfile(entry, request.kind),
      message: '请先填写 API Key 再验证能力',
    }
  }

  const inferred = baseProfile(entry, request.kind)
  const probedAt = new Date().toISOString()

  try {
    const probe = buildProbeBody(entry, request.kind)
    const res = await axios({
      method: probe.method as 'GET' | 'POST',
      url: probe.url,
      data: probe.body,
      headers: probe.headers,
      timeout: 30000,
      validateStatus: (status) => status < 500,
    })

    const status = res.status
    if (status === 401 || status === 403) {
      return {
        ok: false,
        probedAt,
        profile: inferred,
        message: 'API Key 无效或无权访问',
      }
    }

    const profile = upgradeProfile(inferred)
    const expiresAt = new Date(Date.now() + cacheTtlMs(profile.confidence)).toISOString()
    repo.upsert({
      configId: request.configId,
      kind: request.kind,
      profile,
      probedAt,
      expiresAt,
    })

    const message =
      status >= 400
        ? `端点可达（HTTP ${status}），已根据模板确认能力`
        : `探测成功（HTTP ${status}），能力已升级为已探测`

    return { ok: true, probedAt, profile, message }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.warn('capability probe failed', { configId: request.configId, message })
    return {
      ok: false,
      probedAt,
      profile: inferred,
      message: `探测失败：${message}`,
    }
  }
}

export function listProbedProfiles(): ProbedProfileEntry[] {
  repo.purgeExpired()
  return repo.listValid().map((row) => ({
    configId: row.configId,
    profile: row.profile,
    probedAt: row.probedAt,
  }))
}

export function getProbedProfile(configId: string): ModelCapabilityProfile | null {
  repo.purgeExpired()
  return repo.get(configId)
}

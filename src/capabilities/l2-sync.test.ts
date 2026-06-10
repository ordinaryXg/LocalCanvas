import { describe, expect, it } from 'vitest'
import {
  buildModelsListUrl,
  cacheTtlMs,
  collectSyncCredentialSources,
  inferKindForModel,
  mapDiscoveredModel,
  parseModelsListResponse,
  shouldCacheDiscoveredModel,
  shouldShowDiscoveredModel,
  supplementDiscoveredWithCatalog,
} from './l2-sync'
import type { AppConfig } from '../types/config'

describe('buildModelsListUrl', () => {
  it('maps chat completions to models endpoint', () => {
    expect(
      buildModelsListUrl(
        'openai_compatible',
        'https://api.deepseek.com/v1/chat/completions',
      ),
    ).toBe('https://api.deepseek.com/v1/models')
  })

  it('maps anthropic endpoint to models list', () => {
    expect(buildModelsListUrl('openai_compatible', 'https://api.anthropic.com/v1/messages')).toBe(
      'https://api.anthropic.com/v1/models',
    )
  })

  it('maps google generative language endpoint', () => {
    expect(
      buildModelsListUrl(
        'openai_compatible',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      ),
    ).toBe('https://generativelanguage.googleapis.com/v1/models')
  })

  it('uses ark models for seedance', () => {
    expect(buildModelsListUrl('volcengine_seedance', 'https://example.com/tasks')).toContain(
      '/models',
    )
  })
})

describe('parseModelsListResponse', () => {
  it('parses openai style list', () => {
    expect(
      parseModelsListResponse({
        data: [{ id: 'gpt-4o' }, { id: 'deepseek-chat' }],
      }),
    ).toEqual(['gpt-4o', 'deepseek-chat'])
  })
})

describe('mapDiscoveredModel', () => {
  it('maps seedance 2.0 to builtin video profile', () => {
    const mapped = mapDiscoveredModel('doubao-seedance-2-0-260128', 'video')
    expect(mapped.in_catalog).toBe(true)
    expect(mapped.kind).toBe('video')
    expect(mapped.profile.profile_key).toBe('seedance-2-0')
  })

  it('maps seedance 1.5 pro to builtin video profile', () => {
    const mapped = mapDiscoveredModel('doubao-seedance-1-5-pro-251215', 'video')
    expect(mapped.in_catalog).toBe(true)
    expect(mapped.kind).toBe('video')
    expect(mapped.profile.profile_key).toBe('seedance-1-5-pro')
    expect(mapped.preset?.id).toBe('seedance-1-5-pro')
  })

  it('marks unknown model as not in catalog', () => {
    const mapped = mapDiscoveredModel('totally-new-model-xyz', 'llm')
    expect(mapped.in_catalog).toBe(false)
    expect(mapped.kind).toBeNull()
    expect(mapped.profile.source).toBe('inferred')
    expect(shouldCacheDiscoveredModel(mapped)).toBe(false)
    expect(shouldShowDiscoveredModel(mapped)).toBe(false)
  })
})

describe('collectSyncCredentialSources', () => {
  it('dedupes same endpoint key', () => {
    const config = {
      llm_models: [
        {
          id: 'a',
          name: 'A',
          provider: 'openai_compatible',
          endpoint: 'https://api.deepseek.com/v1/chat/completions',
          api_key: 'sk-test',
          model: 'deepseek-chat',
        },
      ],
      image_models: [],
      video_models: [],
      tts_models: [],
      settings: {} as AppConfig['settings'],
    } as AppConfig
    expect(collectSyncCredentialSources(config)).toHaveLength(1)
  })
})

describe('cacheTtlMs', () => {
  it('uses longer ttl for documented profiles', () => {
    expect(cacheTtlMs('documented')).toBeGreaterThan(cacheTtlMs('inferred'))
  })
})

describe('inferKindForModel', () => {
  it('detects video from model id', () => {
    expect(inferKindForModel('doubao-seedance-1-0-pro-fast-251015')).toBe('video')
  })

  it('keeps LLM models as llm even when sync hint is image', () => {
    expect(inferKindForModel('deepseek-chat', 'image')).toBe('llm')
    expect(inferKindForModel('deepseek-v4-flash', 'image')).toBe('llm')
  })

  it('classifies unknown deepseek endpoint ids as llm when sync hint is image', () => {
    expect(inferKindForModel('ep-20250101-deepseek-v3', 'image')).toBe('llm')
  })

  it('classifies seedream as image regardless of hint', () => {
    expect(inferKindForModel('doubao-seedream-4-5-251128', 'llm')).toBe('image')
    expect(inferKindForModel('doubao-seedream-5.0-lite', 'video')).toBe('image')
    expect(inferKindForModel('doubao-seedream-5-0-260128', 'llm')).toBe('image')
  })

  it('maps ark seedream 5.0 lite id to catalog preset', () => {
    const mapped = mapDiscoveredModel('doubao-seedream-5-0-260128', 'image')
    expect(mapped.in_catalog).toBe(true)
    expect(mapped.kind).toBe('image')
    expect(mapped.preset?.id).toBe('seedream-5-0-lite')
    expect(shouldShowDiscoveredModel(mapped)).toBe(true)
  })

  it('returns null for unknown ark endpoint ids instead of defaulting to llm', () => {
    expect(inferKindForModel('ep-20260201-abcdef')).toBeNull()
    expect(inferKindForModel('ep-20260201-abcdef', 'llm')).toBeNull()
    expect(inferKindForModel('ep-20260201-abcdef', 'image')).toBeNull()
  })
})

describe('supplementDiscoveredWithCatalog', () => {
  it('includes seedream 5.0 lite preset when not configured', () => {
    const config = {
      llm_models: [],
      image_models: [
        {
          id: 'seedream-4-5',
          name: 'Seedream 4.5',
          provider: 'openai_compatible',
          endpoint: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
          api_key: 'sk-test',
          model: 'doubao-seedream-4-5-251128',
        },
      ],
      video_models: [],
      tts_models: [],
      settings: {} as AppConfig['settings'],
    } as AppConfig

    const entries = supplementDiscoveredWithCatalog(config, [])
    expect(entries.some((e) => e.preset_id === 'seedream-5-0-lite')).toBe(true)
    expect(entries.find((e) => e.preset_id === 'seedream-5-0-lite')?.model_id).toBe(
      'doubao-seedream-5-0-260128',
    )
  })
})

describe('parseModelsListResponse dedupe', () => {
  it('removes duplicate model ids', () => {
    expect(
      parseModelsListResponse({
        data: [{ id: 'gpt-4o' }, { id: 'gpt-4o' }, { id: 'deepseek-chat' }],
      }),
    ).toEqual(['gpt-4o', 'deepseek-chat'])
  })
})

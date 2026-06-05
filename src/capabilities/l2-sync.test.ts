import { describe, expect, it } from 'vitest'
import {
  buildModelsListUrl,
  cacheTtlMs,
  collectSyncCredentialSources,
  inferKindForModel,
  mapDiscoveredModel,
  parseModelsListResponse,
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

  it('marks unknown model as not in catalog', () => {
    const mapped = mapDiscoveredModel('totally-new-model-xyz', 'llm')
    expect(mapped.in_catalog).toBe(false)
    expect(mapped.profile.source).toBe('inferred')
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
})

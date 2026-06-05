import { describe, expect, it } from 'vitest'
import { enrichWorkflowPlanWithModels } from './agent-plan-enrich'
import { selectModelForRequirement } from './agent-model-select'
import type { AppConfig } from '../types/config'

const baseSettings: AppConfig['settings'] = {
  default_image_model: 'seedream-4-5',
  default_video_model: 'seedance-1-0-pro-fast',
  default_llm: 'deepseek-v4-flash',
  default_tts: '',
  output_dir: '',
  temp_dir: '',
  max_concurrent_tasks: 1,
  auto_save_interval: 30,
  ffmpeg_path: '',
}

function mockConfig(): AppConfig {
  return {
    llm_models: [
      {
        id: 'deepseek-v4-flash',
        name: 'DeepSeek Flash',
        provider: 'openai_compatible',
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        model: 'deepseek-v4-flash',
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai_compatible',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o',
      },
    ],
    image_models: [
      {
        id: 'seedream-4-5',
        name: 'Seedream',
        provider: 'openai_compatible',
        endpoint: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
        model: 'doubao-seedream-4-5-251128',
      },
    ],
    video_models: [
      {
        id: 'seedance-1-0-pro-fast',
        name: 'Seedance 1.0',
        provider: 'volcengine_seedance',
        endpoint: 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
        model: 'doubao-seedance-1-0-pro-fast-251015',
      },
      {
        id: 'seedance-2-0',
        name: 'Seedance 2.0',
        provider: 'volcengine_seedance',
        endpoint: 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
        model: 'doubao-seedance-2-0-260128',
      },
    ],
    tts_models: [],
    settings: baseSettings,
  }
}

describe('selectModelForRequirement', () => {
  it('picks vision LLM when needsVision', () => {
    const picked = selectModelForRequirement(mockConfig(), { kind: 'llm', needsVision: true })
    expect(picked?.configId).toBe('gpt-4o')
  })

  it('prefers text-only LLM for plain text', () => {
    const picked = selectModelForRequirement(mockConfig(), { kind: 'llm', needsVision: false })
    expect(picked?.configId).toBe('deepseek-v4-flash')
  })

  it('picks seedance 2.0 when last frame required', () => {
    const picked = selectModelForRequirement(mockConfig(), {
      kind: 'video',
      needsLastFrame: true,
      needsFirstFrame: true,
    })
    expect(picked?.configId).toBe('seedance-2-0')
  })
})

describe('enrichWorkflowPlanWithModels', () => {
  it('assigns seedance 2.0 for first-last-frame workflow', () => {
    const plan = {
      version: 1 as const,
      intent: '过渡',
      summary: '首尾帧',
      executionMode: 'auto' as const,
      estimatedSteps: 3,
      nodes: [
        { tempId: 'video-1', type: 'video' as const, data: {} },
      ],
      edges: [
        { source: 'a', sourceHandle: 'image', target: 'video-1', targetHandle: 'firstFrame' },
        { source: 'b', sourceHandle: 'image', target: 'video-1', targetHandle: 'lastFrame' },
      ],
    }
    const { plan: enriched } = enrichWorkflowPlanWithModels(plan, mockConfig())
    expect(enriched.nodes[0]?.data.modelId).toBe('seedance-2-0')
  })
})

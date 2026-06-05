import type { CustomAdapterConfig } from '../types/config'
import type { InputSlotSpec, ModelCapabilityProfile, ModelKind, OutputSpec } from '../types/capability'

function inferKindFromEndpoint(endpoint: string): ModelKind | undefined {
  const lower = endpoint.toLowerCase()
  if (lower.includes('/images/') || lower.includes('image/generation')) return 'image'
  if (lower.includes('video') || lower.includes('seedance') || lower.includes('generation/tasks')) {
    return 'video'
  }
  if (lower.includes('speech') || lower.includes('/tts') || lower.includes('audio')) return 'tts'
  if (lower.includes('chat/completion') || lower.includes('/messages')) return 'llm'
  return undefined
}

function templateBlob(config?: CustomAdapterConfig): string {
  if (!config) return ''
  return JSON.stringify({
    template: config.request_template,
    mapping: config.response_mapping,
    poll: config.poll_config,
  }).toLowerCase()
}

function hasToken(blob: string, ...tokens: string[]): boolean {
  return tokens.some((t) => blob.includes(t.toLowerCase()))
}

function buildInputs(kind: ModelKind, blob: string): InputSlotSpec[] {
  const inputs: InputSlotSpec[] = []

  if (hasToken(blob, '{{prompt}}', '"prompt"', 'prompt:', 'text')) {
    inputs.push({ id: 'prompt', modality: 'text', max_count: 1 })
  }

  if (kind === 'llm' && hasToken(blob, 'image_url', 'image', 'vision', 'messages')) {
    const multi = hasToken(blob, 'images', 'content[]', 'type":"image')
    inputs.push({ id: 'image', modality: 'image', max_count: multi ? 10 : 1 })
  }

  if (hasToken(blob, 'system_prompt', '{{system_prompt}}', '"system"')) {
    inputs.push({ id: 'system', modality: 'text', max_count: 1 })
  }

  if (hasToken(blob, 'reference_image', 'image_urls', '{{reference', '"image":[')) {
    const multi = hasToken(blob, 'image_urls', 'images', '"image":[')
    inputs.push({
      id: 'reference_image',
      modality: 'image',
      max_count: multi ? 9 : 1,
    })
  } else if (
    kind === 'image' &&
    hasToken(blob, 'image_url', '{{image}}', 'img2img', 'image_to_image')
  ) {
    inputs.push({ id: 'reference_image', modality: 'image', max_count: 1 })
  }

  if (hasToken(blob, 'first_frame', '{{first_frame}}', 'firstframe')) {
    inputs.push({ id: 'first_frame', modality: 'image', max_count: 1 })
  }
  if (hasToken(blob, 'last_frame', '{{last_frame}}', 'lastframe')) {
    inputs.push({ id: 'last_frame', modality: 'image', max_count: 1 })
  }
  if (hasToken(blob, 'reference_video', 'video_url', '{{video}}')) {
    inputs.push({ id: 'reference_video', modality: 'video', max_count: 1 })
  }
  if (hasToken(blob, 'reference_audio', 'audio_url', '{{audio}}')) {
    inputs.push({ id: 'reference_audio', modality: 'audio', max_count: 1 })
  }

  if (inputs.length === 0) {
    inputs.push({ id: 'prompt', modality: 'text', max_count: 1 })
  }

  return inputs
}

function buildOutputs(kind: ModelKind, blob: string): OutputSpec[] {
  const asyncOut = hasToken(blob, 'poll_config', 'task_id', 'status')
  if (kind === 'image') return [{ modality: 'image', async: asyncOut }]
  if (kind === 'video') return [{ modality: 'video', async: true, poll_required: asyncOut }]
  if (kind === 'tts') return [{ modality: 'audio', async: asyncOut }]
  return [{ modality: 'text' }]
}

export function inferProfileFromCustomConfig(
  kind: ModelKind,
  configId: string,
  displayName: string,
  options?: {
    customConfig?: CustomAdapterConfig
    endpoint?: string
    apiModel?: string
  },
): ModelCapabilityProfile {
  const resolvedKind = options?.endpoint
    ? (inferKindFromEndpoint(options.endpoint) ?? kind)
    : kind
  const blob = templateBlob(options?.customConfig)
  const endpointBlob = (options?.endpoint ?? '').toLowerCase()

  return {
    profile_key: `custom-${configId}`,
    provider: 'custom',
    model_pattern: options?.apiModel ?? '*',
    kind: resolvedKind,
    display_name: displayName || `自定义 ${resolvedKind}`,
    config_ids: [configId],
    inputs: buildInputs(resolvedKind, `${blob} ${endpointBlob}`),
    outputs: buildOutputs(resolvedKind, blob),
    confidence: 'inferred',
    source: 'inferred',
    version: 1,
  }
}

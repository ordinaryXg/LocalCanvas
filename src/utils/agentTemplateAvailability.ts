import type { AppConfig } from '../types/config'
import { selectModelForRequirement } from '../capabilities/agent-model-select'

export function getTemplateUnavailableReason(
  templateId: string,
  config: AppConfig,
): string | undefined {
  if (templateId === 'first-last-frame') {
    const selected = selectModelForRequirement(config, {
      kind: 'video',
      needsLastFrame: true,
    })
    if (!selected) return 'missingLastFrame'
  }
  if (templateId === 'text-to-video') {
    if (config.image_models.length === 0) return 'missingImage'
    if (config.video_models.length === 0) return 'missingVideo'
  }
  if (templateId === 'script-to-film') {
    if (config.llm_models.length === 0) return 'missingLlm'
  }
  return undefined
}

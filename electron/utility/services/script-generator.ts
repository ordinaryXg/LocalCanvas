import {
  SCRIPT_SYSTEM_PROMPT,
  parseScriptResponse,
  type ScriptPayload,
} from '../../../src/utils/scriptGenerator'
import { normalizeTextGenerateResult } from '../../../src/utils/textGenerateResult'
import type { AdapterRegistry } from './model-adapter/factory'

export async function generateScriptFromStory(
  adapters: AdapterRegistry,
  modelId: string,
  storyInput: string,
  characterInput?: string,
): Promise<ScriptPayload> {
  const adapter = adapters.getLLMAdapter(modelId)
  const userPrompt = characterInput?.trim()
    ? `故事梗概：\n${storyInput}\n\n人物小传：\n${characterInput}`
    : `故事梗概：\n${storyInput}`

  const raw = await adapter.generateText({
    prompt: userPrompt,
    systemPrompt: SCRIPT_SYSTEM_PROMPT,
    model: '',
    maxTokens: 4096,
    temperature: 0.7,
    nodeId: '',
  })

  const { content } = normalizeTextGenerateResult(raw)
  return parseScriptResponse(content)
}

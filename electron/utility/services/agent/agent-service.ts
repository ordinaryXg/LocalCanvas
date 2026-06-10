import { normalizeTextGenerateResult } from '../../../../src/utils/textGenerateResult'
import type { AdapterRegistry } from '../model-adapter/factory'
import type { AppConfig } from '../../../../src/types/config'
import type { WorkflowPlan } from '../../../../src/types/agent'
import { AdapterError, AdapterErrorCode } from '../../../../src/types/adapter-errors'
import { hasUsableApiKey, isAuthRelatedMessage } from '../../../../src/utils/apiKey'
import { getLlmModelConfig, resolveDefaultLlmModelId } from '../../../../src/utils/configResolve'
import { parseWorkflowPlan } from '../../../../src/utils/parseWorkflowPlan'
import { WORKFLOW_PLANNER_SYSTEM_PROMPT } from './prompts/workflow-planner'
import { matchSkill, buildSkillPlan } from './skills/index'
import { buildModelCatalogSection } from '../../../../src/capabilities/agent-catalog'
import { enrichWorkflowPlanWithModels } from '../../../../src/capabilities/agent-plan-enrich'

export interface AgentChatRequest {
  message: string
  disabledSkills?: string[]
}

export interface AgentChatResponse {
  reply: string
  plan?: WorkflowPlan
  skillId?: string
}

function tryTextToVideoFallback(
  context: {
    intent: string
    defaultLlm: string
    defaultImageModel: string
    defaultVideoModel: string
  },
  config: AppConfig,
  disabled: string[],
  prefix?: string,
): AgentChatResponse | null {
  if (disabled.includes('text-to-video')) return null
  const fallback = buildSkillPlan('text-to-video', context)
  if (!fallback) return null
  const enriched = enrichWorkflowPlanWithModels(fallback, config)
  const warn =
    enriched.warnings.length > 0 ? `\n\n⚠ ${enriched.warnings.join('\n')}` : ''
  return {
    reply: `${prefix ?? ''}已回退到「文生图生视频」模板：${enriched.plan.summary}\n\n确认后将工作流添加到画布。${warn}`,
    plan: enriched.plan,
    skillId: 'text-to-video',
  }
}

function llmKeyHint(config: AppConfig, llmId: string): string {
  const model = getLlmModelConfig(config, llmId)
  const name = model?.name ?? llmId
  return `请在 ⚙️ 设置 → 已接入模型 →「${name}」中填写有效的火山方舟 API Key（console.volcengine.com 创建，非 OpenAI 的 sk- 密钥）。`
}

export async function agentChat(
  adapters: AdapterRegistry,
  config: AppConfig,
  request: AgentChatRequest,
): Promise<AgentChatResponse> {
  const intent = request.message.trim()
  if (!intent) {
    return { reply: '请描述你想制作的视频内容。' }
  }

  const context = {
    intent,
    defaultLlm: config.settings.default_llm,
    defaultImageModel: config.settings.default_image_model,
    defaultVideoModel: config.settings.default_video_model,
  }

  const disabled = request.disabledSkills ?? []
  const matched = matchSkill(intent, disabled)
  if (matched) {
    const enriched = enrichWorkflowPlanWithModels(matched.buildPlan(context), config)
    const warn =
      enriched.warnings.length > 0 ? `\n\n⚠ ${enriched.warnings.join('\n')}` : ''
    return {
      reply: `已匹配技能「${matched.name}」：${enriched.plan.summary}\n\n确认后将工作流添加到画布。${warn}`,
      plan: enriched.plan,
      skillId: matched.id,
    }
  }

  const llmId = resolveDefaultLlmModelId(config)
  if (!llmId) {
    return {
      reply: '未配置默认 LLM 模型，请先在设置中配置语言模型，或使用包含「脚本」「宣传片」等关键词的描述以使用内置技能。',
    }
  }

  const llmConfig = getLlmModelConfig(config, llmId)
  if (!hasUsableApiKey(llmConfig?.api_key)) {
    const fallback = tryTextToVideoFallback(
      context,
      config,
      disabled,
      '未检测到有效的 LLM API Key。\n\n',
    )
    if (fallback) return fallback
    return {
      reply: `未配置有效的 LLM API Key。${llmKeyHint(config, llmId)}也可在描述中加入「宣传片」「短视频」等词使用内置模板。`,
    }
  }

  try {
    const adapter = adapters.getLLMAdapter(llmId)
    const catalog = buildModelCatalogSection(config)
    const raw = await adapter.generateText({
      prompt: `用户意图：\n${intent}\n\n请生成工作流计划 JSON。`,
      systemPrompt: `${WORKFLOW_PLANNER_SYSTEM_PROMPT}\n\n${catalog}`,
      model: '',
      maxTokens: 4096,
      temperature: 0.3,
      stream: false,
      nodeId: 'agent',
    })
    const { content: rawText } = normalizeTextGenerateResult(raw)

    const enriched = enrichWorkflowPlanWithModels(parseWorkflowPlan(rawText, intent), config)
    const warn =
      enriched.warnings.length > 0 ? `\n\n⚠ ${enriched.warnings.join('\n')}` : ''
    return {
      reply: `${enriched.plan.summary}\n\n共 ${enriched.plan.nodes.length} 个节点，${enriched.plan.edges.length} 条连线。确认后添加到画布。${warn}`,
      plan: enriched.plan,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const authFailed =
      (err instanceof AdapterError && err.code === AdapterErrorCode.AUTH_FAILED) ||
      isAuthRelatedMessage(message)

    const fallback = tryTextToVideoFallback(
      context,
      config,
      disabled,
      authFailed ? `LLM API Key 无效或格式不正确。${llmKeyHint(config, llmId)}\n\n` : 'LLM 规划失败，',
    )
    if (fallback) return fallback

    if (authFailed) {
      return {
        reply: `LLM API Key 无效或格式不正确。${llmKeyHint(config, llmId)}`,
      }
    }
    throw err
  }
}

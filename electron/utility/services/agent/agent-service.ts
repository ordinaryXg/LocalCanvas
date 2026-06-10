import { normalizeTextGenerateResult } from '../../../../src/utils/textGenerateResult'
import type { AdapterRegistry } from '../model-adapter/factory'
import type { AppConfig } from '../../../../src/types/config'
import type { WorkflowPlan } from '../../../../src/types/agent'
import { AdapterError, AdapterErrorCode } from '../../../../src/types/adapter-errors'
import { hasUsableApiKey, isAuthRelatedMessage } from '../../../../src/utils/apiKey'
import { getLlmModelConfig, resolveDefaultLlmModelId } from '../../../../src/utils/configResolve'
import { parseWorkflowPlan } from '../../../../src/utils/parseWorkflowPlan'
import { WORKFLOW_PLANNER_SYSTEM_PROMPT } from './prompts/workflow-planner'
import { buildSkillPlan, rankSkillsForIntent } from './skills/index'
import { buildModelCatalogSection } from '../../../../src/capabilities/agent-catalog'
import { enrichWorkflowPlanWithModels } from '../../../../src/capabilities/agent-plan-enrich'

export interface AgentChatRequest {
  message: string
  disabledSkills?: string[]
  /** When true, skip template suggestion gate and use LLM / fallback directly */
  freePlan?: boolean
}

export interface SuggestedTemplate {
  id: string
  name: string
  description: string
  score: number
}

export interface AgentChatResponse {
  reply: string
  plan?: WorkflowPlan
  skillId?: string
  suggestedTemplates?: SuggestedTemplate[]
  planWarnings?: string[]
}

export interface AgentBuildTemplateRequest {
  skillId: string
  intent: string
  disabledSkills?: string[]
}

function toSuggestedTemplates(
  intent: string,
  disabled: string[],
): SuggestedTemplate[] {
  const maxScore = Math.max(1, ...rankSkillsForIntent(intent, disabled).map((r) => r.score))
  return rankSkillsForIntent(intent, disabled)
    .slice(0, 3)
    .map(({ skill, score }) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      score: Math.round((score / maxScore) * 100),
    }))
}

function formatPlanReply(summary: string, enriched: ReturnType<typeof enrichWorkflowPlanWithModels>, prefix?: string): AgentChatResponse {
  const warn =
    enriched.warnings.length > 0 ? `\n\n⚠ ${enriched.warnings.join('\n')}` : ''
  return {
    reply: `${prefix ?? ''}${summary}\n\n确认后将工作流添加到画布。${warn}`,
    plan: enriched.plan,
    planWarnings: enriched.warnings,
  }
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
  return {
    ...formatPlanReply(`已回退到「文生图生视频」模板：${enriched.plan.summary}`, enriched, prefix),
    skillId: 'text-to-video',
  }
}

export function agentBuildFromTemplate(
  config: AppConfig,
  request: AgentBuildTemplateRequest,
): AgentChatResponse {
  const intent = request.intent.trim()
  const disabled = request.disabledSkills ?? []
  if (disabled.includes(request.skillId)) {
    return { reply: '该工作流模板已在设置中关闭。' }
  }
  const context = {
    intent,
    defaultLlm: config.settings.default_llm,
    defaultImageModel: config.settings.default_image_model,
    defaultVideoModel: config.settings.default_video_model,
  }
  const raw = buildSkillPlan(request.skillId, context)
  if (!raw) {
    return { reply: '未找到该工作流模板。' }
  }
  const enriched = enrichWorkflowPlanWithModels(raw, config)
  const skill = rankSkillsForIntent(intent, disabled).find((r) => r.skill.id === request.skillId)?.skill
  return {
    ...formatPlanReply(`已选用模板「${skill?.name ?? request.skillId}」：${enriched.plan.summary}`, enriched),
    skillId: request.skillId,
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
  const suggestions = toSuggestedTemplates(intent, disabled)

  if (!request.freePlan && suggestions.length > 0) {
    return {
      reply: '根据你的描述，推荐以下工作流模板。采纳后将生成计划预览；也可跳过由 AI 自由规划。',
      suggestedTemplates: suggestions,
    }
  }

  const llmId = resolveDefaultLlmModelId(config)
  if (!llmId) {
    if (suggestions.length > 0) {
      return {
        reply: '未配置默认 LLM。请采纳下方推荐模板，或先在设置中配置语言模型。',
        suggestedTemplates: suggestions,
      }
    }
    return {
      reply: '未配置默认 LLM 模型，请先在设置 → Agent 中完成配置，或描述更具体的需求以匹配内置模板。',
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
    return formatPlanReply(
      `${enriched.plan.summary}\n\n共 ${enriched.plan.nodes.length} 个节点，${enriched.plan.edges.length} 条连线。`,
      enriched,
    )
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

import { normalizeTextGenerateResult } from '../../../../src/utils/textGenerateResult'
import type { AdapterRegistry } from '../model-adapter/factory'
import type { AppConfig } from '../../../../src/types/config'
import type { GraphPatch, ProductionPlan, WorkflowPlan } from '../../../../src/types/agent'
import { parseGraphPatch } from '../../../../src/utils/parseGraphPatch'
import { enrichGraphPatchWithModels } from '../../../../src/capabilities/agent-patch-enrich'
import { AdapterError, AdapterErrorCode } from '../../../../src/types/adapter-errors'
import { hasUsableApiKey, isAuthRelatedMessage } from '../../../../src/utils/apiKey'
import { getLlmModelConfig, resolveDefaultLlmModelId } from '../../../../src/utils/configResolve'
import { parseWorkflowPlan } from '../../../../src/utils/parseWorkflowPlan'
import { WORKFLOW_PLANNER_SYSTEM_PROMPT } from './prompts/workflow-planner'
import { GRAPH_PATCH_PLANNER_SYSTEM_PROMPT } from './prompts/graph-patch-planner'
import { buildSkillPlan, isStudioProductionTemplate, rankSkillsForIntent } from './skills/index'
import { buildModelCatalogSection } from '../../../../src/capabilities/agent-catalog'
import { enrichWorkflowPlanWithModels } from '../../../../src/capabilities/agent-plan-enrich'
import { tryBuildRuleBasedGraphPatch } from '../../../../src/utils/buildRuleBasedGraphPatch'
import { classifyFilmTrack } from '../../../../src/utils/filmTypeClassifier'
import {
  buildProductionPlan,
  type BuildProductionPlanParams,
} from '../../../../src/utils/buildProductionPlan'
import type { CreativeBibleEntry } from '../../../../src/types/project'
import {
  buildExpandProductionShotsPatch,
  type ExpandProductionShotsParams,
} from '../../../../src/utils/expandProductionShots'

export interface AgentChatRequest {
  message: string
  disabledSkills?: string[]
  /** When true, skip template suggestion gate and use LLM / fallback directly */
  freePlan?: boolean
  defaultTrack?: 'auto' | 'lite' | 'studio'
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
  productionPlan?: ProductionPlan
  patch?: GraphPatch
  skillId?: string
  suggestedTemplates?: SuggestedTemplate[]
  planWarnings?: string[]
}

export interface AgentBuildPatchRequest {
  message: string
  focusedNodeIds: string[]
  canvasNodes: Array<{
    id: string
    type: string
    label?: string
    data: Record<string, unknown>
  }>
  canvasEdges: Array<{
    id: string
    source: string
    target: string
    sourceHandle?: string | null
    targetHandle?: string | null
  }>
}

export interface AgentBuildTemplateRequest {
  skillId: string
  intent: string
  disabledSkills?: string[]
  brief?: BuildProductionPlanParams['brief']
  defaultTrack?: 'auto' | 'lite' | 'studio'
  creativeBible?: CreativeBibleEntry[]
  takesPerShot?: number
}

export interface AgentExpandShotsRequest {
  productionPlan: ProductionPlan
  anchorNodeIds: string[]
  maxShots?: number
  referenceImageNodeId?: string
}

function toSuggestedTemplates(
  intent: string,
  disabled: string[],
  defaultTrack: 'auto' | 'lite' | 'studio' = 'auto',
): SuggestedTemplate[] {
  const ranked = rankSkillsForIntent(intent, disabled, defaultTrack)
  const maxScore = Math.max(1, ...ranked.map((r) => r.score))
  return ranked.slice(0, 3).map(({ skill, score }) => ({
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
  defaultTrack: 'auto' | 'lite' | 'studio' = 'auto',
): AgentChatResponse | null {
  if (classifyFilmTrack(context.intent, defaultTrack).track === 'studio') return null
  if (disabled.includes('text-to-video')) return null
  const fallback = buildSkillPlan('text-to-video', context)
  if (!fallback) return null
  const enriched = enrichWorkflowPlanWithModels(fallback, config)
  return {
    ...formatPlanReply(`已回退到「文生图生视频」模板：${enriched.plan.summary}`, enriched, prefix),
    skillId: 'text-to-video',
  }
}

function formatProductionPlanReply(
  plan: ProductionPlan,
  enrichedWarnings: string[],
  prefix?: string,
): AgentChatResponse {
  const warn =
    enrichedWarnings.length > 0 ? `\n\n⚠ ${enrichedWarnings.join('\n')}` : ''
  const budget =
    plan.durationBudget.level === 'warn'
      ? `\n\n⚠ 镜头总时长 ${plan.durationBudget.sumSec}s，与目标 ${plan.durationBudget.targetSec}s 略有偏差。`
      : ''
  return {
    reply: `${prefix ?? ''}${plan.summary}\n\n${plan.shots.length} 镜 · Studio 骨架落盘。确认 Brief 与镜头表后添加到画布。${budget}${warn}`,
    productionPlan: plan,
    plan: plan.workflow,
    planWarnings: enrichedWarnings,
    skillId: plan.templateId,
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

  if (isStudioProductionTemplate(request.skillId)) {
    const templateId = request.skillId as
      | 'brand-spot-30s'
      | 'narrative-short'
      | 'product-demo'
      | 'montage-broll'
    const rawPlan = buildProductionPlan({
      intent,
      templateId,
      brief: request.brief,
      creativeBible: request.creativeBible,
      takesPerShot: request.takesPerShot,
    })
    const enriched = enrichWorkflowPlanWithModels(rawPlan.workflow, config)
    const plan: ProductionPlan = { ...rawPlan, workflow: enriched.plan }
    const skill = rankSkillsForIntent(intent, disabled).find((r) => r.skill.id === request.skillId)?.skill
    return formatProductionPlanReply(
      plan,
      enriched.warnings,
      `已选用 Studio 模板「${skill?.name ?? request.skillId}」：`,
    )
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
  const defaultTrack = request.defaultTrack ?? 'auto'
  const suggestions = toSuggestedTemplates(intent, disabled, defaultTrack)

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
      defaultTrack,
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
      prompt: `用户意图：\n${intent}\n\n请生成工作流计划 JSON。只规划一种风格的一条主链路；text.draft 最多两句话，禁止多方案/分镜表。`,
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
      defaultTrack,
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

function formatCanvasContext(request: AgentBuildPatchRequest): string {
  const nodeLines = request.canvasNodes.map((n) => {
    const label = n.label ?? (n.data.label as string | undefined) ?? n.type
    return `- ${n.id} (${n.type}) ${label}`
  })
  const edgeLines = request.canvasEdges.map(
    (e) => `- ${e.source} --[${e.sourceHandle ?? 'out'}→${e.targetHandle ?? 'in'}]--> ${e.target}`,
  )
  return `选中节点 id：${request.focusedNodeIds.join(', ')}\n\n画布节点：\n${nodeLines.join('\n')}\n\n相关连线：\n${edgeLines.join('\n') || '（无）'}`
}

function buildGraphPatchResponse(
  patch: GraphPatch,
  config: AppConfig,
  replyPrefix = '',
): AgentChatResponse {
  const enriched = enrichGraphPatchWithModels(patch, config)
  const warn =
    enriched.warnings.length > 0 ? `\n\n⚠ ${enriched.warnings.join('\n')}` : ''
  const addCount = enriched.patch.addNodes?.length ?? 0
  const edgeCount = enriched.patch.addEdges?.length ?? 0
  return {
    reply: `${replyPrefix}${enriched.patch.summary}\n\n将新增 ${addCount} 个节点、${edgeCount} 条连线。确认后应用到画布。${warn}`,
    patch: enriched.patch,
    planWarnings: enriched.warnings,
  }
}

export async function agentBuildPatch(
  adapters: AdapterRegistry,
  config: AppConfig,
  request: AgentBuildPatchRequest,
): Promise<AgentChatResponse> {
  const intent = request.message.trim()
  if (!intent) {
    return { reply: '请描述你想对选中节点做什么修改。' }
  }
  if (request.focusedNodeIds.length === 0) {
    return { reply: 'Build 模式需要先选中至少一个画布节点。' }
  }

  const rulePatch = tryBuildRuleBasedGraphPatch({
    message: intent,
    focusedNodeIds: request.focusedNodeIds,
    canvasNodes: request.canvasNodes,
  })
  if (rulePatch) {
    return buildGraphPatchResponse(rulePatch, config)
  }

  const llmId = resolveDefaultLlmModelId(config)
  if (!llmId) {
    return { reply: '未配置默认 LLM，无法生成图补丁。可尝试更明确的描述（如「图像后接 5 秒视频，首帧用该图」）。' }
  }
  const llmConfig = getLlmModelConfig(config, llmId)
  if (!hasUsableApiKey(llmConfig?.api_key)) {
    return { reply: `未配置有效的 LLM API Key。${llmKeyHint(config, llmId)}` }
  }

  try {
    const adapter = adapters.getLLMAdapter(llmId)
    const catalog = buildModelCatalogSection(config)
    const context = formatCanvasContext(request)
    const raw = await adapter.generateText({
      prompt: `用户意图：\n${intent}\n\n${context}\n\n请生成 GraphPatch JSON。`,
      systemPrompt: `${GRAPH_PATCH_PLANNER_SYSTEM_PROMPT}\n\n${catalog}`,
      model: '',
      maxTokens: 4096,
      temperature: 0.2,
      stream: false,
      nodeId: 'agent-build',
    })
    const { content: rawText } = normalizeTextGenerateResult(raw)
    let parsed: GraphPatch
    try {
      parsed = parseGraphPatch(rawText, intent, request.focusedNodeIds)
    } catch (parseErr) {
      const detail = parseErr instanceof Error ? parseErr.message : String(parseErr)
      return {
        reply: `图补丁 JSON 解析失败：${detail}\n\n请重试，或改用更具体的描述（例如「在选中图像后添加 5 秒视频，首帧接 image 输出」）。`,
      }
    }
    return buildGraphPatchResponse(parsed, config)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { reply: `图补丁生成失败：${message}` }
  }
}

export function agentExpandShots(
  config: AppConfig,
  request: AgentExpandShotsRequest,
): AgentChatResponse {
  if (!request.anchorNodeIds.length) {
    return { reply: '请先选中脚本或分镜组节点作为展开锚点。' }
  }
  const { patch, warnings, expandedCount } = buildExpandProductionShotsPatch({
    plan: request.productionPlan,
    anchorNodeIds: request.anchorNodeIds,
    maxShots: request.maxShots,
    referenceImageNodeId: request.referenceImageNodeId,
    defaultImageModel: config.settings.default_image_model,
    defaultVideoModel: config.settings.default_video_model,
  } satisfies ExpandProductionShotsParams)

  const enriched = enrichGraphPatchWithModels(patch, config)
  const allWarnings = [...warnings, ...enriched.warnings]
  const response = buildGraphPatchResponse(
    enriched.patch,
    config,
    `已生成前 ${expandedCount} 镜 per-shot 子图预览。`,
  )
  return { ...response, planWarnings: allWarnings }
}

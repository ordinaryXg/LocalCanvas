import type { AdapterRegistry } from '../model-adapter/factory'
import type { AppConfig } from '../../../../src/types/config'
import type { WorkflowPlan } from '../../../../src/types/agent'
import { parseWorkflowPlan } from '../../../../src/utils/parseWorkflowPlan'
import { WORKFLOW_PLANNER_SYSTEM_PROMPT } from './prompts/workflow-planner'
import { matchSkill, buildSkillPlan } from './skills/index'

export interface AgentChatRequest {
  message: string
  disabledSkills?: string[]
}

export interface AgentChatResponse {
  reply: string
  plan?: WorkflowPlan
  skillId?: string
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
    const plan = matched.buildPlan(context)
    return {
      reply: `已匹配技能「${matched.name}」：${plan.summary}\n\n确认后将工作流添加到画布。`,
      plan,
      skillId: matched.id,
    }
  }

  const llmId = config.settings.default_llm
  if (!llmId) {
    return {
      reply: '未配置默认 LLM 模型，请先在设置中配置语言模型，或使用包含「脚本」「宣传片」等关键词的描述以使用内置技能。',
    }
  }

  try {
    const adapter = adapters.getLLMAdapter(llmId)
    const raw = await adapter.generateText({
      prompt: `用户意图：\n${intent}\n\n请生成工作流计划 JSON。`,
      systemPrompt: WORKFLOW_PLANNER_SYSTEM_PROMPT,
      model: '',
      maxTokens: 4096,
      temperature: 0.3,
      nodeId: 'agent',
    })

    const plan = parseWorkflowPlan(raw, intent)
    return {
      reply: `${plan.summary}\n\n共 ${plan.nodes.length} 个节点，${plan.edges.length} 条连线。确认后添加到画布。`,
      plan,
    }
  } catch (err) {
    const fallback = buildSkillPlan('text-to-video', context)
    if (fallback && !disabled.includes('text-to-video')) {
      return {
        reply: `LLM 规划失败，已回退到「文生图生视频」模板：${fallback.summary}`,
        plan: fallback,
        skillId: 'text-to-video',
      }
    }
    throw err
  }
}

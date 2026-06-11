import type { PlannedEdge } from '../types/agent'

/** 文本节点默认系统提示：约束 LLM 只返回单条可用提示词 */
export const TEXT_NODE_IMAGE_PROMPT_SYSTEM = `你是 AI 绘画/视频提示词工程师，不是聊天助手。你的唯一任务：把用户需求转成一条可直接用于文生图/文生视频的英文提示词。

硬性规则（违反任何一条都视为失败）：
1. 只输出一条提示词正文；第一个字符起就是提示词，禁止任何前言、后语、标题、markdown、表格、编号列表
2. 禁止输出「这是…」「为你准备…」「以下是…」「合集」「多种风格」「方案一/二/三」「可以直接复制」等说明性文字
3. 禁止提及 Runway、Pika、Sora、Kling、可灵、Luma 等工具或平台名称
4. 禁止输出多个方案、备选、分场景列表；只选一种最合适风格写一条
5. 禁止配音文案、分镜表、拍摄建议、音乐建议、使用教程
6. 提示词使用英文，逗号分隔关键词，长度 80-400 字符
7. 只描述一个画面或一个短镜头（3-10 秒量级），不要覆盖整支 30 秒多镜头短片

输出格式：纯英文提示词一行，无引号包裹，无前后说明。`

/** 注入 workflow-planner / graph-patch-planner 的 text 节点规划规则 */
export const WORKFLOW_PLANNER_TEXT_NODE_RULES = `
text 节点（下游接 image/video 的 prompt 时）：
- draft：仅一两句话概括用户意图，禁止完整脚本、分镜表、markdown、多方案
- 勿在 data 中写 systemPrompt 字段（运行时会自动注入）
- 一个 text 节点只服务一个画面/镜头，多镜头请用多个 text 或 script 节点
- 禁止在单个 text 的 draft 里堆叠多种风格方案`

export function textNodeFeedsVisualPrompt(
  nodeId: string,
  edges: Array<{ source: string; target?: string; sourceHandle?: string; targetHandle?: string }>,
  nodeTypes?: Map<string, string>,
): boolean {
  const direct = edges.some(
    (e) =>
      e.source === nodeId &&
      (e.sourceHandle === 'prompt' || e.sourceHandle == null) &&
      e.targetHandle === 'prompt',
  )
  if (direct) return true

  if (!nodeTypes) return false

  const visited = new Set<string>()
  const stack = [nodeId]
  while (stack.length) {
    const id = stack.pop()!
    if (visited.has(id)) continue
    visited.add(id)
    for (const e of edges) {
      if (e.source !== id || !e.target) continue
      const targetType = nodeTypes.get(e.target)
      if (targetType === 'image' || targetType === 'video') return true
      stack.push(e.target)
    }
  }
  return false
}

/**
 * 解析文本节点生成时使用的 systemPrompt。
 * 未在高级设置中自定义时，始终使用默认提示词工程约束（与是否连线无关）。
 */
export function resolveTextNodeSystemPrompt(
  nodeId: string,
  edges: Array<{ source: string; target?: string; sourceHandle?: string; targetHandle?: string }>,
  existing?: string,
  nodeTypes?: Map<string, string>,
): string {
  if (existing?.trim()) return existing.trim()
  void nodeId
  void edges
  void nodeTypes
  return TEXT_NODE_IMAGE_PROMPT_SYSTEM
}

/** 强化用户消息，避免模型进入「助手说明」模式 */
export function buildTextNodeGeneratePrompt(draft: string): string {
  const trimmed = draft.trim()
  return [
    '【任务】根据以下需求，生成唯一一条英文 AI 生图/生视频提示词。',
    '【禁止】不要解释、不要前言、不要列出多个方案或工具名称。',
    '',
    trimmed,
  ].join('\n')
}

function stripMarkdownInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim()
}

const META_LINE =
  /^(这是|以下|为你|下面是|我把|本文|Here is|This is|I've|Below are|Sure)/i
const META_CONTENT =
  /合集|为你准备|可以直接复制|分成了不同|多种风格|等工具|Prompts\)|AI短片提示词|主要针对|以下(?:是|为)|不同(?:的)?风格/i
const MULTI_STYLE =
  /^(方案|风格|Style|Option|Version|备选|Alternative|Scene|镜头)\s*[一二三四五六七八\d：:.]/i

function isMetaLine(line: string): boolean {
  const plain = stripMarkdownInline(line)
  if (!plain) return true
  if (META_LINE.test(plain)) return true
  if (META_CONTENT.test(plain)) return true
  if (/^#{1,3}\s/.test(plain)) return true
  if (/^[-*•]\s*(方案|风格|Scene|Option)/i.test(plain)) return true
  return false
}

function looksLikeEnglishPrompt(line: string): boolean {
  const plain = stripMarkdownInline(line)
  const letters = plain.match(/[a-zA-Z]/g)?.length ?? 0
  if (letters < 24) return false
  const ratio = letters / plain.length
  return ratio > 0.4 && (plain.includes(',') || plain.split(/\s+/).length >= 6)
}

/** 将 LLM 多方案/说明性输出收敛为单条提示词 */
export function coerceSinglePromptOutput(raw: string): string {
  let text = raw.trim()
  if (!text) return text

  const codeBlock = text.match(/```[\w]*\n?([\s\S]*?)```/)
  if (codeBlock?.[1]?.trim()) {
    text = codeBlock[1].trim()
  }

  text = stripMarkdownInline(text)

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) return text

  const englishCandidates = lines.filter((l) => looksLikeEnglishPrompt(l) && !isMetaLine(l))
  if (englishCandidates.length > 0) {
    return englishCandidates.sort((a, b) => b.length - a.length)[0]!
  }

  for (const line of lines) {
    if (isMetaLine(line) || MULTI_STYLE.test(line)) continue
    const plain = stripMarkdownInline(line.replace(/^\d+[.)）、]\s*/, ''))
    if (plain.length >= 24 && !plain.endsWith(':') && !plain.endsWith('：')) {
      return plain
    }
  }

  if (lines.length === 1 && !isMetaLine(lines[0]!)) {
    return stripMarkdownInline(lines[0]!)
  }

  const fallback = lines.find((l) => !isMetaLine(l) && !MULTI_STYLE.test(l))
  return fallback ? stripMarkdownInline(fallback) : stripMarkdownInline(lines[0] ?? text)
}

/** Plan 落盘前为接视觉节点的 text 注入 systemPrompt */
export function injectTextNodePromptConstraints<
  T extends { type: string; tempId: string; data: Record<string, unknown> },
>(nodes: T[], edges: PlannedEdge[]): T[] {
  const nodeTypes = new Map(nodes.map((n) => [n.tempId, n.type]))
  return nodes.map((node) => {
    if (node.type !== 'text') return node
    const edgeRefs = edges.map((e) => ({
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }))
    if (!textNodeFeedsVisualPrompt(node.tempId, edgeRefs, nodeTypes)) return node
    const existing =
      typeof node.data.systemPrompt === 'string' ? node.data.systemPrompt : ''
    if (existing.trim()) return node
    return {
      ...node,
      data: {
        ...node.data,
        systemPrompt: TEXT_NODE_IMAGE_PROMPT_SYSTEM,
      },
    }
  })
}

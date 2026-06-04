export interface ScriptRowPayload {
  sequence: number
  description: string
  prompt: string
  duration: number
  camera: string
}

export interface ScriptPayload {
  title: string
  rows: ScriptRowPayload[]
}

export const SCRIPT_SYSTEM_PROMPT = `你是一位专业分镜脚本编剧。根据用户提供的故事梗概，输出 JSON 格式的分镜脚本。

要求：
1. 只输出 JSON，不要 markdown 代码块或其它说明文字
2. 每个分镜包含：sequence（序号从1开始）、description（画面描述，中文）、prompt（AI 图像/视频生成提示词，英文）、duration（秒，4-15）、camera（运镜：静止/左移/右移/推近/拉远/环绕）
3. 分镜数量 3-8 个，节奏合理
4. prompt 需详细描述画面主体、光影、风格，适合 AI 生成

JSON 格式：
{
  "title": "脚本标题",
  "rows": [
    { "sequence": 1, "description": "...", "prompt": "...", "duration": 5, "camera": "静止" }
  ]
}`

export function parseScriptResponse(content: string): ScriptPayload {
  const trimmed = content.trim()
  const jsonStr = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  const parsed = JSON.parse(jsonStr) as Partial<ScriptPayload>
  if (!parsed.title || !Array.isArray(parsed.rows) || parsed.rows.length === 0) {
    throw new Error('LLM 返回的分镜 JSON 格式无效')
  }

  const rows = parsed.rows.map((row, index) => ({
    sequence: row.sequence ?? index + 1,
    description: String(row.description ?? ''),
    prompt: String(row.prompt ?? ''),
    duration: Math.min(15, Math.max(4, Number(row.duration) || 5)),
    camera: String(row.camera ?? '静止'),
  }))

  return { title: String(parsed.title), rows }
}

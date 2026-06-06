/** Extract the first complete JSON object/array from LLM text. */
export function extractJsonFromLlm(raw: string): string | null {
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  try {
    JSON.parse(cleaned)
    return cleaned
  } catch {
    // fall through
  }

  const startObj = cleaned.indexOf('{')
  const startArr = cleaned.indexOf('[')
  let start = -1
  if (startObj >= 0 && startArr >= 0) start = Math.min(startObj, startArr)
  else start = Math.max(startObj, startArr)
  if (start < 0) return null

  const open = cleaned[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\' && inString) {
      escape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return cleaned.slice(start, i + 1)
    }
  }
  return null
}

export function parseLlmJson<T>(raw: string): T | null {
  const json = extractJsonFromLlm(raw)
  if (!json) return null
  try {
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

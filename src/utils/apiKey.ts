/** 去掉首尾空白与误粘贴的引号 */
export function sanitizeApiKey(raw?: string): string {
  if (!raw) return ''
  return raw.trim().replace(/^['"]+|['"]+$/g, '')
}

export function hasUsableApiKey(raw?: string): boolean {
  const key = sanitizeApiKey(raw)
  if (key.length < 8) return false
  const lower = key.toLowerCase()
  if (lower.includes('your-api') || lower === 'sk-xxx' || lower === 'xxx') return false
  return true
}

export function isAuthRelatedMessage(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('api key') ||
    lower.includes('authentication') ||
    lower.includes('unauthorized') ||
    lower.includes('认证') ||
    lower.includes('api_key')
  )
}

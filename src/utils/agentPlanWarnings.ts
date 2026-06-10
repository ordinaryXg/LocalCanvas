export type PlanWarningLevel = 'blocking' | 'degraded' | 'info'

export function classifyPlanWarning(message: string): PlanWarningLevel {
  if (message.includes('未找到已接入的')) return 'blocking'
  if (message.includes('无完全匹配') || message.includes('已选最接近')) return 'degraded'
  return 'info'
}

export function summarizePlanWarnings(warnings: string[]): {
  blocking: boolean
  degraded: boolean
  levels: PlanWarningLevel[]
} {
  const levels = warnings.map(classifyPlanWarning)
  return {
    blocking: levels.includes('blocking'),
    degraded: levels.includes('degraded'),
    levels,
  }
}

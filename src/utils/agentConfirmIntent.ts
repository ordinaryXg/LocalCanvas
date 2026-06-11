/** 用户把预览按钮文案发到输入框时，应走 apply 而非重新 build/chat */
export function isPatchConfirmMessage(text: string, applyPatchLabel?: string): boolean {
  const s = text.trim()
  if (!s) return false
  if (applyPatchLabel && s === applyPatchLabel.trim()) return true
  return /^(确认并应用补丁|确认应用补丁|应用补丁|确认补丁|apply\s*patch)$/i.test(s)
}

export function isPlanConfirmMessage(text: string, applyPlanLabel?: string): boolean {
  const s = text.trim()
  if (!s) return false
  if (applyPlanLabel && s === applyPlanLabel.trim()) return true
  return /^(确认并添加到画布|确认并添加|应用计划|apply\s*plan)$/i.test(s)
}

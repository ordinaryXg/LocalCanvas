const cancelledTaskIds = new Set<string>()

export function markTaskCancelled(taskId: string): void {
  cancelledTaskIds.add(taskId)
}

export function isTaskCancelled(taskId: string): boolean {
  return cancelledTaskIds.has(taskId)
}

export function clearTaskCancelled(taskId: string): void {
  cancelledTaskIds.delete(taskId)
}

export function cancelledError(): Error {
  return new Error('任务已取消')
}

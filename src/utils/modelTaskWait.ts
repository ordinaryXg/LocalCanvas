import type { ModelCompleteEvent, ModelErrorEvent, ModelProgressEvent } from '../types/ipc'
import { formatErrorMessage } from '../types/adapter-errors'

const DEFAULT_VIDEO_TASK_TIMEOUT_MS = 12 * 60 * 1000

export type ModelTaskWaitOptions = {
  nodeId: string
  taskId: string
  onProgress?: (percentage: number) => void
  timeoutMs?: number
}

function matchesTask(
  event: { taskId?: string; nodeId?: string },
  taskId: string,
  nodeId: string,
): boolean {
  if (event.taskId && event.taskId === taskId) return true
  return event.nodeId === nodeId
}

export function waitForModelTaskEvent(options: ModelTaskWaitOptions): Promise<{
  result: string
  reasoningContent?: string
}> {
  const { nodeId, taskId, onProgress, timeoutMs = DEFAULT_VIDEO_TASK_TIMEOUT_MS } = options

  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      cleanup()
      fn()
    }

    const cleanup = () => {
      unsubProgress()
      unsubComplete()
      unsubError()
    }

    const timer = window.setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            '视频生成超时（超过 12 分钟），请检查网络、API Key 与模型是否已开通，或稍后重试',
          ),
        ),
      )
    }, timeoutMs)

    const unsubProgress = window.api.on('model:progress', (...args: unknown[]) => {
      const p = args[0] as ModelProgressEvent
      if (matchesTask(p, taskId, nodeId)) {
        onProgress?.(p.percentage)
      }
    })

    const unsubComplete = window.api.on('model:complete', (...args: unknown[]) => {
      const e = args[0] as ModelCompleteEvent
      if (matchesTask(e, taskId, nodeId)) {
        finish(() => resolve({ result: e.result, reasoningContent: e.reasoningContent }))
      }
    })

    const unsubError = window.api.on('model:error', (...args: unknown[]) => {
      const e = args[0] as ModelErrorEvent
      if (matchesTask(e, taskId, nodeId)) {
        finish(() => reject(new Error(formatErrorMessage(e.error || '生成失败'))))
      }
    })
  })
}

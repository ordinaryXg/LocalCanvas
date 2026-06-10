import { useCallback, useEffect, useRef, useState } from 'react'
import type { ModelCompleteEvent, ModelErrorEvent, ModelProgressEvent } from '../types/ipc'

type BeginFn = () => Promise<{ taskId: string }>

export function useModelGeneration(nodeId: string, onProgress?: (percentage: number) => void) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastReasoningContent, setLastReasoningContent] = useState<string | undefined>(undefined)
  const taskIdRef = useRef<string | null>(null)
  const onProgressRef = useRef(onProgress)

  useEffect(() => {
    onProgressRef.current = onProgress
  }, [onProgress])

  const run = useCallback(
    async (begin: BeginFn): Promise<{ result: string; reasoningContent?: string }> => {
      setIsGenerating(true)
      setProgress(0)
      setLastError(null)
      setLastReasoningContent(undefined)

      try {
        return await new Promise<{ result: string; reasoningContent?: string }>((resolve, reject) => {
          let taskId: string | null = null
          let reasoningContent: string | undefined

          const cleanup = () => {
            unsubProgress()
            unsubComplete()
            unsubError()
          }

          const unsubProgress = window.api.on('model:progress', (...args: unknown[]) => {
            const p = args[0] as ModelProgressEvent
            if (
              (taskId && p.taskId === taskId) ||
              (p.nodeId === nodeId && (!p.taskId || p.taskId === taskId))
            ) {
              setProgress(p.percentage)
              onProgressRef.current?.(p.percentage)
            }
          })

          const unsubComplete = window.api.on('model:complete', (...args: unknown[]) => {
            const e = args[0] as ModelCompleteEvent
            if (taskId && e.taskId === taskId) {
              cleanup()
              reasoningContent = e.reasoningContent
              if (e.reasoningContent) setLastReasoningContent(e.reasoningContent)
              resolve({ result: e.result, reasoningContent: e.reasoningContent })
            }
          })

          const unsubError = window.api.on('model:error', (...args: unknown[]) => {
            const e = args[0] as ModelErrorEvent
            if (taskId && e.taskId === taskId) {
              cleanup()
              const message = e.error || '生成失败'
              setLastError(message)
              reject(new Error(message))
            }
          })

          void begin()
            .then(({ taskId: id }) => {
              taskId = id
              taskIdRef.current = id
            })
            .catch((err) => {
              cleanup()
              reject(err)
            })
        })
      } finally {
        taskIdRef.current = null
        setIsGenerating(false)
      }
    },
    [nodeId],
  )

  const cancel = useCallback(async () => {
    const taskId = taskIdRef.current
    if (!taskId) return
    await window.api.model.cancel(taskId)
    taskIdRef.current = null
    setIsGenerating(false)
    setProgress(0)
  }, [])

  return { isGenerating, progress, lastError, lastReasoningContent, setProgress, run, cancel, taskIdRef }
}

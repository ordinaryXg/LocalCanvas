import { useCallback, useRef, useState } from 'react'
import type { ModelCompleteEvent, ModelErrorEvent, ModelProgressEvent } from '../types/ipc'

type BeginFn = () => Promise<{ taskId: string }>

export function useModelGeneration(nodeId: string, onProgress?: (percentage: number) => void) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const taskIdRef = useRef<string | null>(null)

  const run = useCallback(
    async (begin: BeginFn): Promise<string> => {
      setIsGenerating(true)
      setProgress(0)
      setLastError(null)

      try {
        return await new Promise<string>((resolve, reject) => {
          let taskId: string | null = null

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
              onProgress?.(p.percentage)
            }
          })

          const unsubComplete = window.api.on('model:complete', (...args: unknown[]) => {
            const e = args[0] as ModelCompleteEvent
            if (taskId && e.taskId === taskId) {
              cleanup()
              resolve(e.result)
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
    [nodeId, onProgress],
  )

  const cancel = useCallback(async () => {
    const taskId = taskIdRef.current
    if (!taskId) return
    await window.api.model.cancel(taskId)
    taskIdRef.current = null
    setIsGenerating(false)
    setProgress(0)
  }, [])

  return { isGenerating, progress, lastError, setProgress, run, cancel, taskIdRef }
}

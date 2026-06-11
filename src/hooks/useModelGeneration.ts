import { useCallback, useEffect, useRef, useState } from 'react'
import { formatErrorMessage } from '../types/adapter-errors'
import { waitForModelTaskEvent } from '../utils/modelTaskWait'

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
        const { taskId } = await begin()
        taskIdRef.current = taskId

        const payload = await waitForModelTaskEvent({
          nodeId,
          taskId,
          onProgress: (pct) => {
            setProgress(pct)
            onProgressRef.current?.(pct)
          },
        })

        if (payload.reasoningContent) {
          setLastReasoningContent(payload.reasoningContent)
        }

        return payload
      } catch (err) {
        const message = formatErrorMessage(err)
        setLastError(message)
        throw err instanceof Error ? err : new Error(message)
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

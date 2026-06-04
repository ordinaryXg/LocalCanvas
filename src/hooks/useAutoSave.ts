import { useEffect, useRef, useCallback } from 'react'
import { useCanvasStore } from '../stores/canvasStore'
import { useProjectStore } from '../stores/projectStore'
import { AUTO_SAVE_DELAY_MS } from '../utils/constants'
import { handleError } from '../utils/ErrorHandler'

export function useAutoSave(): void {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const viewport = useCanvasStore((s) => s.viewport)
  const { currentProjectId, projectName, isDirty, startSave, finishSave, failSave } =
    useProjectStore()

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(async () => {
    if (!currentProjectId || !window.api) return
    startSave()
    try {
      const payload = {
        id: currentProjectId,
        name: projectName,
        viewport,
        nodes,
        edges,
        groups: [],
        updatedAt: new Date().toISOString(),
      }
      await window.api.project.save(JSON.stringify(payload))
      finishSave()
    } catch (error) {
      failSave(error instanceof Error ? error.message : '保存失败')
      handleError(error, 'autoSave')
    }
  }, [currentProjectId, projectName, viewport, nodes, edges, startSave, finishSave, failSave])

  useEffect(() => {
    if (!currentProjectId || !isDirty) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      void save()
    }, AUTO_SAVE_DELAY_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [nodes, edges, viewport, currentProjectId, isDirty, save])

  useEffect(() => {
    const onBlur = () => {
      if (isDirty) void save()
    }
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [isDirty, save])
}

export function useManualSave(onSave?: () => void): () => Promise<void> {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const viewport = useCanvasStore((s) => s.viewport)
  const { currentProjectId, projectName, startSave, finishSave, failSave } = useProjectStore()

  return useCallback(async () => {
    if (!currentProjectId) return
    startSave()
    try {
      await window.api.project.save(
        JSON.stringify({
          id: currentProjectId,
          name: projectName,
          viewport,
          nodes,
          edges,
          groups: [],
        }),
      )
      finishSave()
      onSave?.()
    } catch (error) {
      failSave(error instanceof Error ? error.message : '保存失败')
      handleError(error, 'manualSave')
    }
  }, [currentProjectId, projectName, viewport, nodes, edges, startSave, finishSave, failSave, onSave])
}

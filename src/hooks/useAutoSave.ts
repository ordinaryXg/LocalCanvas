import { useEffect, useRef, useCallback } from 'react'
import { useCanvasStore } from '../stores/canvasStore'
import { useProjectStore } from '../stores/projectStore'
import { AUTO_SAVE_DELAY_MS } from '../utils/constants'
import { handleError } from '../utils/ErrorHandler'
import { ensureNodeAssetsOnDisk } from '../utils/assetStorage'
import { buildProjectSavePayload } from '../utils/projectPayload'

async function saveProjectToDisk(
  projectId: string,
  projectName: string,
  nodes: ReturnType<typeof useCanvasStore.getState>['nodes'],
  edges: ReturnType<typeof useCanvasStore.getState>['edges'],
  viewport: ReturnType<typeof useCanvasStore.getState>['viewport'],
): Promise<void> {
  const nodesWithAssets = await ensureNodeAssetsOnDisk(projectId, nodes)
  const metadata = useProjectStore.getState().metadata
  const payload = buildProjectSavePayload({
    id: projectId,
    name: projectName,
    viewport,
    nodes: nodesWithAssets,
    edges,
    metadata,
  })
  await window.api.project.save(JSON.stringify(payload))
}

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
      await saveProjectToDisk(currentProjectId, projectName, nodes, edges, viewport)
      finishSave()
    } catch (error) {
      failSave(error instanceof Error ? error.message : '保存失败')
      handleError(error, 'autoSave')
    }
  }, [currentProjectId, projectName, viewport, nodes, edges, startSave, finishSave, failSave])

  useEffect(() => {
    if (!currentProjectId || !isDirty) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    if (timerRef.current) return

    timerRef.current = setTimeout(() => {
      timerRef.current = null
      console.info('[autoSave] coalesced save after %dms window', AUTO_SAVE_DELAY_MS)
      void save()
    }, AUTO_SAVE_DELAY_MS)
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
      await saveProjectToDisk(currentProjectId, projectName, nodes, edges, viewport)
      finishSave()
      onSave?.()
    } catch (error) {
      failSave(error instanceof Error ? error.message : '保存失败')
      handleError(error, 'manualSave')
    }
  }, [currentProjectId, projectName, viewport, nodes, edges, startSave, finishSave, failSave, onSave])
}

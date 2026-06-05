import { useCallback } from 'react'
import { useCanvasStore } from '../stores/canvasStore'
import { useProjectStore } from '../stores/projectStore'
import { FLUID_RESONANCE } from '../constants/fluidFeatures'

export function useFluidCompiler() {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const setNodes = useCanvasStore((s) => s.setNodes)
  const setEdges = useCanvasStore((s) => s.setEdges)
  const projectId = useProjectStore((s) => s.currentProjectId)

  const compileDown = useCallback(async () => {
    if (!projectId || !FLUID_RESONANCE) return
    const result = await window.api.fluidCompiler.compileDown(projectId, nodes, edges)
    setNodes(result.nodes as typeof nodes)
    setEdges(result.edges as typeof edges)
  }, [projectId, nodes, edges, setNodes, setEdges])

  const syncBindings = useCallback(async () => {
    if (!projectId) return
    await window.api.fluidCompiler.syncBindings(projectId, nodes)
  }, [projectId, nodes])

  return { compileDown, syncBindings }
}

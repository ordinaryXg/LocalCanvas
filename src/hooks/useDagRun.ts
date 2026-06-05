import { useCallback, useState } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { topologicalSort, DagCycleError } from '../utils/dag/topologicalSort'
import { computeDataFlowPatches } from '../utils/dataFlow'
import { useCanvasStore } from '../stores/canvasStore'
import { useProjectStore } from '../stores/projectStore'
import { collectLlmVisionImagesFromEdges } from '../utils/collectLlmVisionImages'
import { importGeneratedMedia } from '../utils/generatedMedia'
import { handleError } from '../utils/ErrorHandler'
import type { DagRunNodeState, DagRunState } from '../types/dag'

const RATIO_MAP: Record<string, [number, number]> = {
  '1:1': [1920, 1920],
  '16:9': [2560, 1440],
  '9:16': [1440, 2560],
  '3:4': [1920, 2560],
  '4:3': [2560, 1920],
}

const GENERATABLE = new Set(['image', 'video', 'text'])

function collectSubgraph(nodeIds: string[], allNodes: Node[], allEdges: Edge[]) {
  const idSet = new Set(nodeIds)
  const edges = allEdges.filter((e) => idSet.has(e.source) && idSet.has(e.target))
  const nodes = allNodes.filter((n) => idSet.has(n.id))
  return { nodes, edges }
}

function waitForGeneration(taskId: string, nodeId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      unsubComplete()
      unsubError()
    }
    const unsubComplete = window.api.on('model:complete', (...args: unknown[]) => {
      const e = args[0] as { taskId: string; nodeId: string; result: string }
      if (e.taskId === taskId) {
        cleanup()
        resolve(e.result)
      }
    })
    const unsubError = window.api.on('model:error', (...args: unknown[]) => {
      const e = args[0] as { taskId?: string; nodeId?: string; error: string }
      if (e.taskId === taskId) {
        cleanup()
        reject(new Error(e.error || '生成失败'))
      }
    })
  })
}

export function useDagRun() {
  const [runState, setRunState] = useState<DagRunState | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const startRun = useCallback(
    async (nodeIds: string[]) => {
      const projectId = useProjectStore.getState().currentProjectId
      if (!projectId || nodeIds.length === 0) return

      const { nodes: allNodes, edges: allEdges, updateNodeData, setNodes } = useCanvasStore.getState()
      const { nodes, edges } = collectSubgraph(nodeIds, allNodes, allEdges)

      let order: string[]
      try {
        order = topologicalSort(
          nodes.map((n) => n.id),
          edges.map((e) => ({ source: e.source, target: e.target })),
        )
      } catch (err) {
        if (err instanceof DagCycleError) {
          handleError(new Error('工作流存在环路，无法执行'), 'dagCycle')
        }
        return
      }

      const executable = order.filter((id) => {
        const n = nodes.find((x) => x.id === id)
        return n && GENERATABLE.has(n.type ?? '')
      })

      if (executable.length === 0) {
        handleError(new Error('选区内没有可自动生成的节点'), 'dagEmpty')
        return
      }

      const patches = computeDataFlowPatches(allNodes, allEdges)
      if (patches.length > 0) {
        const patched = allNodes.map((n) => {
          const p = patches.find((x) => x.nodeId === n.id)
          return p ? { ...n, data: { ...n.data, ...p.data } } : n
        })
        setNodes(patched)
      }

      const snapshot = { nodeIds, edges }
      const { id: dagRunId } = await window.api.dag.createRun({
        projectId,
        nodeIds: executable,
        snapshot,
      })

      const nodeStates: DagRunNodeState[] = executable.map((nodeId) => ({
        nodeId,
        status: 'pending' as const,
      }))
      setRunState({ dagRunId, status: 'running', nodeStates, completedCount: 0, totalCount: executable.length })
      setIsRunning(true)

      await window.api.dag.updateRun({ dagRunId, status: 'running' })

      let completed = 0
      for (const nodeId of executable) {
        const freshNodes = useCanvasStore.getState().nodes
        const node = freshNodes.find((n) => n.id === nodeId)
        if (!node) continue

        setRunState((s) =>
          s
            ? {
                ...s,
                nodeStates: s.nodeStates.map((ns) =>
                  ns.nodeId === nodeId ? { ...ns, status: 'running' } : ns,
                ),
              }
            : s,
        )
        await window.api.dag.updateNode({ dagRunId, nodeId, status: 'running' })
        await window.api.dag.updateRun({ dagRunId, currentNodeId: nodeId })

        const data = node.data as Record<string, unknown>
        try {
          if (node.type === 'image') {
            const modelId = (data.modelId as string) || ''
            const prompt = (data.prompt as string) || ''
            if (!modelId || !prompt) throw new Error('图片节点缺少模型或提示词')
            const ratio = (data.ratio as string) || '16:9'
            const [width, height] = RATIO_MAP[ratio] || [1024, 1024]
            const { taskId } = await window.api.model.beginGenerateImage({
              modelId,
              nodeId,
              prompt,
              negativePrompt: data.negativePrompt as string | undefined,
              width,
              height,
            })
            const resultPath = await waitForGeneration(taskId, nodeId)
            const { src, assetPath, fileName } = await importGeneratedMedia(projectId, 'image', resultPath)
            updateNodeData(nodeId, {
              imageSrc: src,
              ...(assetPath ? { imageAssetPath: assetPath } : {}),
              fileName,
              isGenerating: false,
              progress: 100,
            })
          } else if (node.type === 'video') {
            const modelId = (data.modelId as string) || ''
            const prompt = (data.prompt as string) || ''
            if (!modelId || !prompt) throw new Error('视频节点缺少模型或提示词')
            const ratio = (data.ratio as string) || '16:9'
            const [width, height] = RATIO_MAP[ratio] || [1280, 720]
            const { taskId } = await window.api.model.beginGenerateVideo({
              modelId,
              nodeId,
              prompt,
              width,
              height,
              duration: (data.duration as number) || 5,
              firstFrame: data.firstFrame as string | undefined,
              lastFrame: data.lastFrame as string | undefined,
            })
            const resultPath = await waitForGeneration(taskId, nodeId)
            const { src, assetPath, fileName } = await importGeneratedMedia(projectId, 'video', resultPath)
            updateNodeData(nodeId, {
              videoSrc: src,
              ...(assetPath ? { videoAssetPath: assetPath } : {}),
              fileName,
              isGenerating: false,
              progress: 100,
            })
          } else if (node.type === 'text') {
            const modelId = (data.modelId as string) || ''
            const draft =
              (data.draft as string) ||
              (data.inputContent as string) ||
              (data.prompt as string) ||
              ''
            if (!modelId || !draft) throw new Error('文本节点缺少模型或草稿')
            const images = await collectLlmVisionImagesFromEdges(
              nodeId,
              nodes,
              edges,
              projectId,
            )
            const { taskId } = await window.api.model.beginGenerateText({
              modelId,
              nodeId,
              prompt: draft,
              systemPrompt: (data.systemPrompt as string) || undefined,
              ...(images.length > 0 ? { images } : {}),
            })
            const result = await waitForGeneration(taskId, nodeId)
            updateNodeData(nodeId, {
              output: result,
              outputMode: 'generated',
              outputEdited: false,
              isGenerating: false,
            })
          }

          completed++
          setRunState((s) =>
            s
              ? {
                  ...s,
                  completedCount: completed,
                  nodeStates: s.nodeStates.map((ns) =>
                    ns.nodeId === nodeId ? { ...ns, status: 'completed' } : ns,
                  ),
                }
              : s,
          )
          await window.api.dag.updateNode({ dagRunId, nodeId, status: 'completed' })
          await window.api.dag.updateRun({ dagRunId, completedNodes: completed })
        } catch (err) {
          const message = err instanceof Error ? err.message : '执行失败'
          setRunState((s) =>
            s
              ? {
                  ...s,
                  nodeStates: s.nodeStates.map((ns) =>
                    ns.nodeId === nodeId ? { ...ns, status: 'failed', error: message } : ns,
                  ),
                }
              : s,
          )
          await window.api.dag.updateNode({ dagRunId, nodeId, status: 'failed', error: message })
          await window.api.dag.updateRun({ dagRunId, status: 'failed', error: message })
          setIsRunning(false)
          handleError(err, 'dagNode')
          return
        }
      }

      await window.api.dag.updateRun({ dagRunId, status: 'completed', completedNodes: completed })
      setRunState((s) => (s ? { ...s, status: 'completed' } : s))
      setIsRunning(false)
    },
    [],
  )

  const dismiss = useCallback(() => setRunState(null), [])

  return { runState, isRunning, startRun, dismiss }
}

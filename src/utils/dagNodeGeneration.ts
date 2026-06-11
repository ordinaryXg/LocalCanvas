import type { ModelCompleteEvent, ModelErrorEvent, ModelProgressEvent } from '../types/ipc'
import { formatErrorMessage } from '../types/adapter-errors'
import { useCanvasStore } from '../stores/canvasStore'
import { nodeHasActiveGeneration } from './canvasGenerationState'
import { waitForModelTaskEvent } from './modelTaskWait'

type UpdateNodeData = (nodeId: string, data: Record<string, unknown>) => void

export function markNodeGenerating(nodeId: string, updateNodeData: UpdateNodeData): void {
  updateNodeData(nodeId, { isGenerating: true, progress: 0, error: undefined })
}

export function markNodeProgress(
  nodeId: string,
  percentage: number,
  updateNodeData: UpdateNodeData,
): void {
  updateNodeData(nodeId, { progress: percentage })
}

export async function runTrackedModelTask(
  nodeId: string,
  updateNodeData: UpdateNodeData,
  begin: () => Promise<{ taskId: string }>,
): Promise<string> {
  const existing = useCanvasStore.getState().nodes.find((n) => n.id === nodeId)
  if (existing && nodeHasActiveGeneration(existing)) {
    throw new Error('该节点正在生成中，请等待完成')
  }

  markNodeGenerating(nodeId, updateNodeData)
  try {
    const { taskId } = await begin()
    return await waitForModelTaskEvent({
      nodeId,
      taskId,
      onProgress: (pct) => markNodeProgress(nodeId, pct, updateNodeData),
    }).then((payload) => payload.result)
  } catch (err) {
    updateNodeData(nodeId, {
      isGenerating: false,
      progress: 0,
      error: formatErrorMessage(err),
    })
    throw err
  }
}

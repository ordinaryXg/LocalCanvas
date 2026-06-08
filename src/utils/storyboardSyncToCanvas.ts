import { useCanvasStore } from '../stores/canvasStore'
import { generateNodeId } from './id'
import type { StoryboardFrame } from '../types/storyboard'
import { assetPathToBlobUrl } from './assetStorage'

const COL_X = 420
const ROW_GAP = 130

export async function syncStoryboardToCanvas(
  storyboardNodeId: string,
  projectId: string,
): Promise<number> {
  const { nodes, addNode, updateNodeData } = useCanvasStore.getState()
  const sb = nodes.find((n) => n.id === storyboardNodeId)
  if (!sb || sb.type !== 'storyboard') return 0

  const data = sb.data as Record<string, unknown>
  const frames = (data.frames as StoryboardFrame[]) ?? []
  if (frames.length === 0) return 0

  const baseX = sb.position.x + COL_X
  const baseY = sb.position.y
  let created = 0
  const nextFrames: StoryboardFrame[] = []

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]
    let imageNodeId = frame.imageNodeId
    let existing = imageNodeId ? nodes.find((n) => n.id === imageNodeId) : undefined

    if (!existing) {
      imageNodeId = generateNodeId('image')
      const position = { x: baseX, y: baseY + i * ROW_GAP }
      addNode({
        id: imageNodeId,
        type: 'image',
        position,
        data: {
          title: `分镜 ${frame.sequence}`,
          prompt: frame.prompt,
        },
      })
      created++
      existing = useCanvasStore.getState().nodes.find((n) => n.id === imageNodeId)
    } else {
      updateNodeData(imageNodeId, {
        title: `分镜 ${frame.sequence}`,
        prompt: frame.prompt,
      })
    }

    if (frame.imagePath && projectId) {
      try {
        const src = await assetPathToBlobUrl(projectId, frame.imagePath)
        updateNodeData(imageNodeId, {
          imageSrc: src,
          imageAssetPath: frame.imagePath,
        })
      } catch {
        /* ignore missing asset */
      }
    }

    nextFrames.push({ ...frame, imageNodeId, status: frame.imagePath ? 'image' : frame.status })
  }

  updateNodeData(storyboardNodeId, { frames: nextFrames })
  return created
}

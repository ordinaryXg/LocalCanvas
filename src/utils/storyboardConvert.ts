import type { ScriptRow } from '../types/node'
import type { StoryboardFrame } from '../types/storyboard'
import { generateId } from './id'

export function scriptRowsToFrames(
  rows: ScriptRow[],
  rowAssets?: Record<number, { imageNodeId?: string; videoNodeId?: string }>,
  nodesData?: Record<string, { imageSrc?: string; videoSrc?: string; imageAssetPath?: string; videoAssetPath?: string }>,
): StoryboardFrame[] {
  return rows.map((row) => {
    const assets = rowAssets?.[row.sequence]
    const imageData = assets?.imageNodeId ? nodesData?.[assets.imageNodeId] : undefined
    const videoData = assets?.videoNodeId ? nodesData?.[assets.videoNodeId] : undefined

    let status: StoryboardFrame['status'] = 'empty'
    if (videoData?.videoSrc || videoData?.videoAssetPath) status = 'video'
    else if (imageData?.imageSrc || imageData?.imageAssetPath) status = 'image'

    return {
      id: generateId('frame'),
      sequence: row.sequence,
      description: row.description,
      prompt: row.prompt,
      duration: row.duration,
      camera: row.camera,
      imageNodeId: assets?.imageNodeId,
      videoNodeId: assets?.videoNodeId,
      imageSrc: imageData?.imageSrc,
      videoSrc: videoData?.videoSrc,
      imagePath: imageData?.imageAssetPath,
      videoPath: videoData?.videoAssetPath,
      status,
    }
  })
}

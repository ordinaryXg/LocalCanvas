import { useCallback } from 'react'
import { useProjectStore } from '../stores/projectStore'
import { useCanvasStore } from '../stores/canvasStore'
import { persistMediaFile, type MediaKind } from '../utils/assetStorage'
import { handleError } from '../utils/ErrorHandler'

export function useNodeMediaUpload(nodeId: string, kind: MediaKind) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const currentProjectId = useProjectStore((s) => s.currentProjectId)

  return useCallback(
    async (file: File) => {
      const pathKey =
        kind === 'image' ? 'imageAssetPath' : kind === 'video' ? 'videoAssetPath' : 'audioAssetPath'
      const srcKey = kind === 'image' ? 'imageSrc' : kind === 'video' ? 'videoSrc' : 'audioSrc'

      if (!currentProjectId || !window.api?.file?.writeAsset) {
        const url = URL.createObjectURL(file)
        updateNodeData(nodeId, { [srcKey]: url, fileName: file.name })
        return
      }

      try {
        const { relativePath, blobUrl } = await persistMediaFile(currentProjectId, kind, file)
        updateNodeData(nodeId, {
          [pathKey]: relativePath,
          [srcKey]: blobUrl,
          fileName: file.name,
        })
      } catch (error) {
        handleError(error, 'uploadMedia')
      }
    },
    [currentProjectId, nodeId, kind, updateNodeData],
  )
}

import { useCallback, useEffect } from 'react'
import { useReactFlow } from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import { useCanvasStore } from '../stores/canvasStore'
import { useProjectStore } from '../stores/projectStore'
import { undo, redo } from '../stores/historyStore'
import { generateNodeId } from '../utils/id'
import { persistMediaFile, type MediaKind } from '../utils/assetStorage'
import { handleError } from '../utils/ErrorHandler'

function fileToMediaKind(file: File): MediaKind | null {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return null
}

function mediaDataFromFile(
  kind: MediaKind,
  relativePath: string,
  blobUrl: string,
  fileName: string,
): Record<string, unknown> {
  if (kind === 'image') {
    return { imageAssetPath: relativePath, imageSrc: blobUrl, fileName }
  }
  if (kind === 'video') {
    return { videoAssetPath: relativePath, videoSrc: blobUrl, fileName }
  }
  return { audioAssetPath: relativePath, audioSrc: blobUrl, fileName }
}

export function useFileDrop() {
  const reactFlow = useReactFlow()
  const addNode = useCanvasStore((s) => s.addNode)
  const currentProjectId = useProjectStore((s) => s.currentProjectId)

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const files = event.dataTransfer.files
      void (async () => {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const offset = i * 40
          const kind = fileToMediaKind(file)
          if (!kind) continue

          const nodeType = kind
          let data: Record<string, unknown> = {
            fileName: file.name,
            [`${kind}Src`]: URL.createObjectURL(file),
          }

          if (currentProjectId && window.api?.file?.writeAsset) {
            try {
              const { relativePath, blobUrl } = await persistMediaFile(
                currentProjectId,
                kind,
                file,
              )
              data = mediaDataFromFile(kind, relativePath, blobUrl, file.name)
            } catch (error) {
              handleError(error, 'fileDrop')
            }
          }

          addNode({
            id: generateNodeId(nodeType),
            type: nodeType,
            position: { x: position.x + offset, y: position.y + offset },
            data,
          })
        }
      })()
    },
    [reactFlow, addNode, currentProjectId],
  )

  return { onDragOver, onDrop }
}

export function useSidebarNodeDrop() {
  const reactFlow = useReactFlow()
  const addNode = useCanvasStore((s) => s.addNode)

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const nodeType = event.dataTransfer.getData('application/localcanvas-node')
      if (!nodeType) return

      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      addNode({
        id: generateNodeId(nodeType),
        type: nodeType,
        position,
        data: {},
        selected: true,
      })
    },
    [reactFlow, addNode],
  )

  return { onDragOver, onDrop }
}

export function useAssetDrop() {
  const reactFlow = useReactFlow()
  const addNode = useCanvasStore((s) => s.addNode)

  const onDragOver = useCallback((event: React.DragEvent) => {
    if (event.dataTransfer.types.includes('application/localcanvas')) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      const raw = event.dataTransfer.getData('application/localcanvas')
      if (!raw) return
      event.preventDefault()

      try {
        const asset = JSON.parse(raw) as {
          type: MediaKind
          path: string
          name: string
          blobUrl?: string
        }
        const position = reactFlow.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        })

        const nodeType = asset.type
        const data = mediaDataFromFile(
          asset.type,
          asset.path,
          asset.blobUrl || '',
          asset.name,
        )

        addNode({
          id: generateNodeId(nodeType),
          type: nodeType,
          position,
          data,
        })
      } catch (error) {
        handleError(error, 'assetDrop')
      }
    },
    [reactFlow, addNode],
  )

  return { onDragOver, onDrop }
}

export function useKeyboardShortcuts(saveProject: () => Promise<void>) {
  const { nodes, edges, restoreSnapshot, groupNodes, removeNodes, selectedNodeIds } =
    useCanvasStore()
  const duplicateNode = useCanvasStore((s) => s.duplicateNode)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey

      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        const snapshot = undo({ nodes, edges })
        if (snapshot) restoreSnapshot(snapshot.nodes, snapshot.edges)
      }

      if (mod && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        const snapshot = redo({ nodes, edges })
        if (snapshot) restoreSnapshot(snapshot.nodes, snapshot.edges)
      }

      if (mod && e.key === 'g') {
        e.preventDefault()
        const ids =
          selectedNodeIds.length > 0
            ? selectedNodeIds
            : nodes.filter((n) => n.selected).map((n) => n.id)
        if (ids.length >= 2) groupNodes(ids)
      }

      if (mod && e.key === 's') {
        e.preventDefault()
        void saveProject()
      }

      if (mod && e.key === 'c') {
        const selected = nodes.find((n) => n.selected)
        if (selected) {
          e.preventDefault()
          duplicateNode(selected.id)
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [nodes, edges, restoreSnapshot, groupNodes, removeNodes, selectedNodeIds, duplicateNode, saveProject])
}

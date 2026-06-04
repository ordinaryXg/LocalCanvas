import { useCallback, useEffect } from 'react'
import { useReactFlow } from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import { useCanvasStore } from '../stores/canvasStore'
import { undo, redo } from '../stores/historyStore'
import { generateNodeId } from '../utils/id'

export function useFileDrop() {
  const reactFlow = useReactFlow()
  const addNode = useCanvasStore((s) => s.addNode)

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
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const offset = i * 40
        let nodeType: string | null = null
        let dataKey = ''

        if (file.type.startsWith('image/')) {
          nodeType = 'image'
          dataKey = 'imageSrc'
        } else if (file.type.startsWith('video/')) {
          nodeType = 'video'
          dataKey = 'videoSrc'
        } else if (file.type.startsWith('audio/')) {
          nodeType = 'audio'
          dataKey = 'audioSrc'
        }

        if (nodeType && dataKey) {
          const url = URL.createObjectURL(file)
          addNode({
            id: generateNodeId(nodeType),
            type: nodeType,
            position: { x: position.x + offset, y: position.y + offset },
            data: { [dataKey]: url, fileName: file.name },
          })
        }
      }
    },
    [reactFlow, addNode],
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
      })
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

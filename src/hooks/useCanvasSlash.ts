import { useCallback, useEffect, useState } from 'react'
import { useCanvasStore as getCanvasStore } from '../stores/canvasStore'
import { useProjectStore } from '../stores/projectStore'
import { useEditorShellStore } from '../stores/editorShellStore'
import { showToast } from '../utils/ErrorHandler'

export function useCanvasSlash(
  selectedNodeIds: string[],
  startRun: (ids: string[], options?: { untilNodeId?: string }) => void | Promise<void>,
) {
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [slashPos, setSlashPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      if (e.key === '/' && !slashOpen) {
        e.preventDefault()
        setSlashPos({ x: window.innerWidth / 2 - 120, y: window.innerHeight / 2 - 80 })
        setSlashQuery('')
        setSlashOpen(true)
        return
      }

      if (slashOpen) {
        if (e.key === 'Backspace') {
          setSlashQuery((q) => q.slice(0, -1))
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          setSlashQuery((q) => q + e.key)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [slashOpen])

  const handleSlashSelect = useCallback(
    (cmd: { id: string }) => {
      setSlashOpen(false)
      if (cmd.id === 'agent') {
        useEditorShellStore.getState().setAgentExpanded(true)
        return
      }
      if (cmd.id === 'grid3' || cmd.id === 'grid5') {
        const layout = cmd.id === 'grid3' ? 'grid3' : 'grid5'
        const store = getCanvasStore.getState()
        const targets = selectedNodeIds.length
          ? store.nodes.filter((n) => selectedNodeIds.includes(n.id) && n.type === 'storyboard')
          : store.nodes.filter((n) => n.type === 'storyboard')
        for (const n of targets) {
          store.updateNodeData(n.id, { layout })
        }
        return
      }
      if (cmd.id === 'run') {
        const ids =
          selectedNodeIds.length > 0
            ? selectedNodeIds
            : getCanvasStore.getState().nodes.map((n) => n.id)
        void startRun(ids)
        return
      }
      if (cmd.id === 'exportStoryboard') {
        const store = getCanvasStore.getState()
        const projectId = useProjectStore.getState().currentProjectId
        const targets = selectedNodeIds.length
          ? store.nodes.filter((n) => selectedNodeIds.includes(n.id) && n.type === 'storyboard')
          : store.nodes.filter((n) => n.type === 'storyboard')
        const target = targets[0]
        if (!target || !projectId) return
        const frames = (target.data.frames as Array<{
          sequence: number
          description: string
          imagePath?: string
        }>) ?? []
        if (frames.length === 0) return
        void window.api.storyboard.export({
          projectId,
          format: 'png',
          layout: (target.data.layout as 'list' | 'grid3' | 'grid5') || 'grid3',
          frames: frames.map((f) => ({
            sequence: f.sequence,
            description: f.description,
            imageAssetPath: f.imagePath,
          })),
        }).then(() => window.api.storyboard.openOutputDir())
        return
      }
      if (cmd.id === 'style') {
        const store = getCanvasStore.getState()
        const imageOrVideo = store.nodes.find(
          (n) =>
            selectedNodeIds.includes(n.id) &&
            (n.type === 'image' || n.type === 'video'),
        )
        if (!imageOrVideo) {
          showToast('请先选中一个图片或视频节点', 'info')
          return
        }
        if (!selectedNodeIds.includes(imageOrVideo.id)) {
          store.setSelectedNodes([imageOrVideo.id])
        }
        useEditorShellStore.getState().requestFocusStyleChips()
      }
    },
    [selectedNodeIds, startRun],
  )

  return { slashOpen, slashQuery, slashPos, setSlashOpen, handleSlashSelect }
}

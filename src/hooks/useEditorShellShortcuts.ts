import { useEffect } from 'react'
import { useCanvasStore } from '../stores/canvasStore'
import { useEditorShellStore } from '../stores/editorShellStore'
import { GENERATABLE_NODE_TYPES, isEditorShell } from '../constants/editorFeatures'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export function useEditorShellShortcuts() {
  const setMode = useEditorShellStore((s) => s.setMode)
  const setGeneratorDrawerOpen = useEditorShellStore((s) => s.setGeneratorDrawerOpen)
  const setShortcutsOpen = useEditorShellStore((s) => s.setShortcutsOpen)
  const generatorDrawerOpen = useEditorShellStore((s) => s.generatorDrawerOpen)
  const setGeneratorDrawerOpenOnly = useEditorShellStore((s) => s.setGeneratorDrawerOpen)
  const openWorkbenchForCompose = useEditorShellStore((s) => s.openWorkbenchForCompose)
  const openWorkbenchForGenerate = useEditorShellStore((s) => s.openWorkbenchForGenerate)
  const mode = useEditorShellStore((s) => s.mode)
  const nodes = useCanvasStore((s) => s.nodes)
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds)
  useEffect(() => {
    if (!isEditorShell()) return

    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return

      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }

      if (e.key === 'Escape') {
        if (generatorDrawerOpen) {
          setGeneratorDrawerOpenOnly(false)
          return
        }
        if (mode !== 'canvas') {
          e.preventDefault()
          setMode('canvas')
        }
        return
      }

      if (e.key === 'g' || e.key === 'G') {
        if (e.ctrlKey || e.metaKey) return
        const node = nodes.find(
          (n) => selectedNodeIds.includes(n.id) && GENERATABLE_NODE_TYPES.has(n.type ?? ''),
        )
        if (!node) return
        e.preventDefault()
        openWorkbenchForGenerate(node.id, node.type)
        return
      }

      if (e.key === 'e' || e.key === 'E') {
        if (e.ctrlKey || e.metaKey) return
        const compose = nodes.find(
          (n) => selectedNodeIds.includes(n.id) && n.type === 'compose',
        )
        if (!compose) return
        e.preventDefault()
        openWorkbenchForCompose(compose.id)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    nodes,
    selectedNodeIds,
    mode,
    generatorDrawerOpen,
    setMode,
    setGeneratorDrawerOpen,
    setGeneratorDrawerOpenOnly,
    setShortcutsOpen,
    openWorkbenchForCompose,
    openWorkbenchForGenerate,
  ])
}

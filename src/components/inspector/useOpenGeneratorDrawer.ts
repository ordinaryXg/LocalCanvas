import { useCallback } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'
import { useEditorShellStore } from '../../stores/editorShellStore'

export function useOpenGeneratorDrawer(nodeId: string) {
  const setSelectedNodes = useCanvasStore((s) => s.setSelectedNodes)
  const setMode = useEditorShellStore((s) => s.setMode)
  const setGeneratorDrawerOpen = useEditorShellStore((s) => s.setGeneratorDrawerOpen)
  const requestScrollToGeneratorWarnings = useEditorShellStore(
    (s) => s.requestScrollToGeneratorWarnings,
  )
  const requestFocusStyleChips = useEditorShellStore((s) => s.requestFocusStyleChips)

  const openDrawer = useCallback(() => {
    setSelectedNodes([nodeId])
    setMode('canvas')
    setGeneratorDrawerOpen(true)
  }, [nodeId, setGeneratorDrawerOpen, setMode, setSelectedNodes])

  const openDrawerWithWarnings = useCallback(() => {
    setSelectedNodes([nodeId])
    setMode('canvas')
    requestScrollToGeneratorWarnings()
  }, [nodeId, requestScrollToGeneratorWarnings, setMode, setSelectedNodes])

  const openDrawerFocusStyle = useCallback(() => {
    setSelectedNodes([nodeId])
    setMode('canvas')
    requestFocusStyleChips()
  }, [nodeId, requestFocusStyleChips, setMode, setSelectedNodes])

  return { openDrawer, openDrawerWithWarnings, openDrawerFocusStyle }
}

import { useCallback } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'
import { useEditorShellStore } from '../../stores/editorShellStore'

/** 选中画布节点并请求视口聚焦（Inspector 连线标签用） */
export function useNavigateToNode() {
  const selectAndFocusNode = useCanvasStore((s) => s.selectAndFocusNode)
  const setMode = useEditorShellStore((s) => s.setMode)

  return useCallback(
    (nodeId: string) => {
      if (useEditorShellStore.getState().mode !== 'canvas') {
        setMode('canvas')
      }
      selectAndFocusNode(nodeId)
    },
    [selectAndFocusNode, setMode],
  )
}

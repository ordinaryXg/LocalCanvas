import { useCallback, useEffect, useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { NODE_TYPE_META } from '../../types/node'
import { generateNodeId } from '../../utils/id'
import { extractWorkflowSnapshot } from '../../utils/workflow'
import { handleError } from '../../utils/ErrorHandler'

export interface ContextMenuState {
  x: number
  y: number
  type: 'pane' | 'node' | 'edge'
  nodeId?: string
  edgeId?: string
}

interface ContextMenuProps {
  menu: ContextMenuState | null
  onClose: () => void
}

export function ContextMenu({ menu, onClose }: ContextMenuProps) {
  const reactFlow = useReactFlow()
  const { nodes, edges, addNode, removeNodes, removeEdge, groupNodes, duplicateNode, selectedNodeIds } =
    useCanvasStore()
  const currentProjectId = useProjectStore((s) => s.currentProjectId)

  useEffect(() => {
    if (!menu) return
    const close = (e: MouseEvent) => {
      if (e.button === 2) return
      onClose()
    }
    const timer = window.setTimeout(() => {
      window.addEventListener('mousedown', close)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('mousedown', close)
    }
  }, [menu, onClose])

  if (!menu) return null

  const createNode = (type: string) => {
    const position = reactFlow.screenToFlowPosition({ x: menu.x, y: menu.y })
    addNode({
      id: generateNodeId(type),
      type,
      position,
      data: {},
      selected: true,
    })
    onClose()
  }

  return (
    <div
      className="fixed z-50 bg-bg-secondary border border-border rounded-lg shadow-xl py-1 min-w-[168px]"
      style={{ left: menu.x, top: menu.y }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {menu.type === 'pane' && (
        <>
          <div className="px-3 py-1 text-xs text-text-muted">新建节点</div>
          {NODE_TYPE_META.map((nt) => (
            <button
              key={nt.type}
              type="button"
              className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary flex items-center gap-2"
              onClick={() => createNode(nt.type)}
            >
              <span>{nt.icon}</span>
              {nt.label}节点
            </button>
          ))}
        </>
      )}

      {menu.type === 'node' && menu.nodeId && (
        <>
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary"
            onClick={() => {
              duplicateNode(menu.nodeId!)
              onClose()
            }}
          >
            📋 复制
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary"
            onClick={() => {
              removeNodes([menu.nodeId!])
              onClose()
            }}
          >
            🗑️ 删除
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary"
            onClick={() => {
              const ids =
                selectedNodeIds.length > 1 ? selectedNodeIds : [menu.nodeId!]
              groupNodes(ids)
              onClose()
            }}
          >
            📦 打组
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary"
            onClick={() => {
              void (async () => {
                if (!currentProjectId || !window.api?.file?.saveWorkflow) {
                  handleError(new Error('请先打开项目'), 'saveWorkflow')
                  return
                }
                const ids =
                  selectedNodeIds.length > 0 ? selectedNodeIds : [menu.nodeId!]
                try {
                  const snapshot = extractWorkflowSnapshot(nodes, edges, ids)
                  const fileName = `workflow-${Date.now()}.json`
                  await window.api.file.saveWorkflow(
                    currentProjectId,
                    fileName,
                    JSON.stringify(snapshot, null, 2),
                  )
                  onClose()
                } catch (error) {
                  handleError(error, 'saveWorkflow')
                }
              })()
            }}
          >
            💾 保存为工作流
          </button>
        </>
      )}

      {menu.type === 'edge' && menu.edgeId && (
        <button
          type="button"
          className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            removeEdge(menu.edgeId!)
            onClose()
          }}
        >
          🗑️ 删除连线
        </button>
      )}
    </div>
  )
}

interface NodePickerProps {
  x: number
  y: number
  onSelect: (type: string) => void
  onClose: () => void
}

export function NodePicker({ x, y, onSelect, onClose }: NodePickerProps) {
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (e.button === 2) return
      onClose()
    }
    const timer = window.setTimeout(() => {
      window.addEventListener('mousedown', close)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('mousedown', close)
    }
  }, [onClose])

  return (
    <div
      className="fixed z-50 bg-bg-secondary border border-border rounded-lg shadow-xl py-1 min-w-[160px]"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1 text-xs text-text-muted">选择节点类型</div>
      {NODE_TYPE_META.map((nt) => (
        <button
          key={nt.type}
          type="button"
          className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary flex items-center gap-2"
          onClick={() => {
            onSelect(nt.type)
            onClose()
          }}
        >
          <span>{nt.icon}</span>
          {nt.label}
        </button>
      ))}
    </div>
  )
}

export function useContextMenuHandlers(
  setMenu: (menu: ContextMenuState | null) => void,
) {
  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault()
      setMenu({
        x: 'clientX' in event ? event.clientX : 0,
        y: 'clientY' in event ? event.clientY : 0,
        type: 'pane',
      })
    },
    [setMenu],
  )

  const onNodeContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent, node: Node) => {
      event.preventDefault()
      setMenu({
        x: 'clientX' in event ? event.clientX : 0,
        y: 'clientY' in event ? event.clientY : 0,
        type: 'node',
        nodeId: node.id,
      })
    },
    [setMenu],
  )

  const onEdgeContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent, edge: Edge) => {
      event.preventDefault()
      setMenu({
        x: 'clientX' in event ? event.clientX : 0,
        y: 'clientY' in event ? event.clientY : 0,
        type: 'edge',
        edgeId: edge.id,
      })
    },
    [setMenu],
  )

  return { onPaneContextMenu, onNodeContextMenu, onEdgeContextMenu }
}

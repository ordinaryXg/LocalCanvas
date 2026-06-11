import { useCallback, useMemo } from 'react'
import type { Edge } from '@xyflow/react'
import type { VideoGeneratorUiConfig } from '../../capabilities/generator-ui'
import { useCanvasStore } from '../../stores/canvasStore'
import { NodeImageThumb } from '../common/NodeImageThumb'
import {
  listVideoImageInputs,
  reassignVideoImageRole,
  resolveVideoInputModes,
  VIDEO_IMAGE_INBOX_HANDLE,
  type VideoInputModes,
} from '../../utils/videoInputLayout'
import {
  listVideoReferenceHandles,
} from '../../utils/videoReferenceSlots'

const DRAG_EDGE_MIME = 'application/x-localcanvas-video-edge'

interface VideoInputMaterialPanelProps {
  nodeId: string
  projectId: string | null
  ui: VideoGeneratorUiConfig
  inputModes: VideoInputModes
  onInputModesChange: (modes: VideoInputModes) => void
}

function readDraggedEdgeId(e: React.DragEvent): string | null {
  const id = e.dataTransfer.getData(DRAG_EDGE_MIME)
  return id || null
}

function DraggableImageChip({
  edge,
  projectId,
  label,
  className = 'w-full h-full',
}: {
  edge: Edge
  projectId: string | null
  label?: string
  className?: string
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_EDGE_MIME, edge.id)
          e.dataTransfer.effectAllowed = 'move'
        }}
        className={`rounded overflow-hidden cursor-grab active:cursor-grabbing ${className}`}
        title="拖动到槽位分配角色"
      >
        <NodeImageThumb projectId={projectId} nodeId={edge.source} alt={label ?? '图片'} />
      </div>
      {label && <span className="text-[9px] text-text-muted">{label}</span>}
    </div>
  )
}

function DropSlot({
  label,
  handle,
  edge,
  projectId,
  onAssign,
  boxClassName = 'w-14 h-10',
}: {
  label: string
  handle: string
  edge: Edge | undefined
  projectId: string | null
  onAssign: (edgeId: string, handle: string) => void
  boxClassName?: string
}) {
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const edgeId = readDraggedEdgeId(e)
    if (edgeId) onAssign(edgeId, handle)
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`rounded overflow-hidden border ${
          edge ? 'border-border border-solid' : 'border-dashed border-border/70 bg-bg-tertiary/30'
        } ${boxClassName}`}
      >
        {edge ? (
          <DraggableImageChip edge={edge} projectId={projectId} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[9px] text-text-muted px-1 text-center">
            拖入
          </div>
        )}
      </div>
      <span className="text-[9px] text-text-muted">{label}</span>
    </div>
  )
}

export function VideoInputMaterialPanel({
  nodeId,
  projectId,
  ui,
  inputModes,
  onInputModesChange,
}: VideoInputMaterialPanelProps) {
  const edges = useCanvasStore((s) => s.edges)
  const setEdges = useCanvasStore((s) => s.setEdges)

  const groups = useMemo(() => listVideoImageInputs(nodeId, edges), [nodeId, edges])
  const referenceHandles = useMemo(
    () => listVideoReferenceHandles(ui.maxReferenceImages),
    [ui.maxReferenceImages],
  )

  const assignRole = useCallback(
    (edgeId: string, handle: string) => {
      setEdges(reassignVideoImageRole(edges, edgeId, handle, nodeId))
    },
    [edges, nodeId, setEdges],
  )

  const toggleMode = (key: keyof VideoInputModes) => {
    onInputModesChange({ ...inputModes, [key]: !inputModes[key] })
  }

  const hasAnyImage =
    groups.inbox.length > 0 ||
    groups.firstFrame ||
    groups.lastFrame ||
    groups.references.length > 0

  const showFirstLast = ui.supportsFirstFrame || ui.supportsLastFrame
  const showReference = ui.supportsReferenceImage && ui.maxReferenceImages > 0

  return (
    <div className="space-y-2">
      {(showFirstLast || showReference) && (
        <div className="flex flex-wrap gap-1.5">
          {showFirstLast && (
            <button
              type="button"
              onClick={() => toggleMode('firstLast')}
              className={`px-2 py-0.5 text-[10px] rounded-full border transition ${
                inputModes.firstLast
                  ? 'border-[var(--node-video)]/60 bg-[var(--node-video)]/15 text-[var(--node-video)]'
                  : 'border-border text-text-muted hover:border-[var(--node-video)]/40'
              }`}
            >
              首尾帧
            </button>
          )}
          {showReference && (
            <button
              type="button"
              onClick={() => toggleMode('reference')}
              className={`px-2 py-0.5 text-[10px] rounded-full border transition ${
                inputModes.reference
                  ? 'border-[var(--node-video)]/60 bg-[var(--node-video)]/15 text-[var(--node-video)]'
                  : 'border-border text-text-muted hover:border-[var(--node-video)]/40'
              }`}
            >
              参考图
            </button>
          )}
        </div>
      )}

      {inputModes.firstLast && showFirstLast && (
        <div>
          <p className="text-[9px] text-text-muted mb-1">首尾帧</p>
          <div className="flex flex-wrap gap-2 items-end">
            {ui.supportsFirstFrame && (
              <DropSlot
                label="首帧"
                handle="firstFrame"
                edge={groups.firstFrame}
                projectId={projectId}
                onAssign={assignRole}
              />
            )}
            {ui.supportsLastFrame && (
              <DropSlot
                label="尾帧"
                handle="lastFrame"
                edge={groups.lastFrame}
                projectId={projectId}
                onAssign={assignRole}
              />
            )}
          </div>
        </div>
      )}

      {inputModes.reference && showReference && (
        <div>
          <p className="text-[9px] text-text-muted mb-1">
            参考图 {groups.references.length}/{ui.maxReferenceImages}
          </p>
          <div className="flex flex-wrap gap-2">
            {referenceHandles.map((handle, index) => {
              const edge = groups.references.find((e) => e.targetHandle === handle)
              return (
                <DropSlot
                  key={handle}
                  label={`参${index + 1}`}
                  handle={handle}
                  edge={edge}
                  projectId={projectId}
                  onAssign={assignRole}
                boxClassName="w-10 h-10"
              />
              )
            })}
          </div>
        </div>
      )}

      <div>
        <p className="text-[9px] text-text-muted mb-1">
          未分配 {groups.inbox.length > 0 ? `(${groups.inbox.length})` : ''}
        </p>
        <div
          className="min-h-[44px] flex flex-wrap gap-2 p-1.5 rounded border border-dashed border-border/70 bg-bg-tertiary/20"
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
          }}
          onDrop={(e) => {
            e.preventDefault()
            const edgeId = readDraggedEdgeId(e)
            if (edgeId) assignRole(edgeId, VIDEO_IMAGE_INBOX_HANDLE)
          }}
        >
          {groups.inbox.map((edge) => (
            <div
              key={edge.id}
              className="w-14 h-10 rounded overflow-hidden border border-border"
            >
              <DraggableImageChip edge={edge} projectId={projectId} className="w-full h-full" />
            </div>
          ))}
          {groups.inbox.length === 0 && !hasAnyImage && (
            <p className="text-[10px] text-text-muted italic px-1">
              连接图片到视频输入口；开启「首尾帧」时首张自动作为首帧，其余进此处
            </p>
          )}
          {groups.inbox.length === 0 && hasAnyImage && (
            <p className="text-[10px] text-text-muted italic px-1">拖回此处取消分配</p>
          )}
        </div>
      </div>

      {groups.inbox.length > 0 && (
        <p className="text-[10px] text-amber-200/90">
          {groups.inbox.length} 张图片未分配角色，生成时不会参与
        </p>
      )}
    </div>
  )
}

export function useVideoInputModes(
  nodeId: string,
  data: Record<string, unknown>,
  ui: VideoGeneratorUiConfig,
): VideoInputModes {
  const edges = useCanvasStore((s) => s.edges)
  return useMemo(
    () => resolveVideoInputModes(data, edges, nodeId, ui),
    [data, edges, nodeId, ui],
  )
}

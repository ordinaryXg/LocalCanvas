import { memo, useEffect, useMemo, useRef } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useCanvasStore } from '../../stores/canvasStore'
import { useEditorShellStore } from '../../stores/editorShellStore'
import type { ComposeClipItem } from '../../types/node'
import { CANVAS_NODE_SHELL_PAD } from '../../utils/imageNodeDisplay'
import { getNodeVisualVariant } from '../../utils/nodeVisualVariant'
import {
  composeClipFlexWeight,
  composeClipLabel,
  composeEmptyHint,
  composeFooterText,
  COMPOSE_PILL_MIN_WIDTH,
  COMPOSE_STRIP_EMPTY_HEIGHT,
  COMPOSE_STRIP_MAX_HEIGHT,
  COMPOSE_STRIP_MIN_HEIGHT,
  COMPOSE_STRIP_WIDTH,
} from '../../utils/composeNodeDisplay'
import {
  getActiveClips,
  isComposeVideoHandle,
  requiredVideoInputCount,
  totalActiveDuration,
} from '../../utils/composeSequence'

function ComposeNodeComponent({ id, data, selected }: NodeProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const lastMeasuredRef = useRef({ width: 0, height: 0 })
  const edges = useCanvasStore((s) => s.edges)
  const updateNodeSize = useCanvasStore((s) => s.updateNodeSize)
  const openWorkbenchForCompose = useEditorShellStore((s) => s.openWorkbenchForCompose)
  const variant = useMemo(() => getNodeVisualVariant(id), [id])

  const clips = (data.clips as ComposeClipItem[] | undefined) ?? []
  const active = getActiveClips(clips)
  const totalDuration = totalActiveDuration(clips)
  const isEmpty = active.length === 0

  const hasAudio =
    !!(typeof data.audioAssetPath === 'string' && data.audioAssetPath) ||
    !!(typeof data.audioSrc === 'string' && data.audioSrc) ||
    edges.some((e) => e.target === id && e.targetHandle === 'audio')

  const hasExport =
    typeof data.outputPath === 'string' && (data.outputPath as string).length > 0

  const connectedVideoCount = edges.filter(
    (e) => e.target === id && isComposeVideoHandle(e.targetHandle),
  ).length
  const videoInputCount = requiredVideoInputCount(clips, connectedVideoCount)

  const connectedHandles = useMemo(
    () =>
      new Set(
        edges
          .filter((e) => e.target === id && e.targetHandle)
          .map((e) => e.targetHandle as string),
      ),
    [edges, id],
  )

  const videoInputs = useMemo(
    () =>
      Array.from({ length: videoInputCount }, (_, i) => {
        const handleId = `video${i + 1}`
        const span = videoInputCount > 1 ? 58 / (videoInputCount - 1) : 0
        return {
          id: handleId,
          top: videoInputCount === 1 ? '50%' : `${18 + span * i}%`,
          connected: connectedHandles.has(handleId),
        }
      }),
    [connectedHandles, videoInputCount],
  )

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return

    let rafId = 0
    const measure = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const measuredWidth = Math.ceil(shell.offsetWidth)
        const measuredHeight = Math.min(
          COMPOSE_STRIP_MAX_HEIGHT + CANVAS_NODE_SHELL_PAD * 2,
          Math.max(
            isEmpty ? COMPOSE_STRIP_EMPTY_HEIGHT : COMPOSE_STRIP_MIN_HEIGHT,
            Math.ceil(shell.offsetHeight),
          ),
        )
        const { width: lastW, height: lastH } = lastMeasuredRef.current
        if (Math.abs(measuredWidth - lastW) < 2 && Math.abs(measuredHeight - lastH) < 2) return

        lastMeasuredRef.current = { width: measuredWidth, height: measuredHeight }
        updateNodeSize(id, measuredWidth, measuredHeight)
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(shell)
    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [active.length, hasAudio, hasExport, id, isEmpty, updateNodeSize])

  const openEditor = () => {
    openWorkbenchForCompose(id)
  }

  const footer = isEmpty ? composeEmptyHint() : composeFooterText(active.length, totalDuration)

  return (
    <div ref={shellRef} className="compose-node-shell">
      <div
        className={`compose-node-strip ${selected ? 'compose-node-strip--selected' : ''} ${
          isEmpty ? 'compose-node-strip--empty' : ''
        }`}
        style={{
          borderRadius: variant.borderRadius,
          width: COMPOSE_STRIP_WIDTH,
          minHeight: isEmpty ? COMPOSE_STRIP_EMPTY_HEIGHT : COMPOSE_STRIP_MIN_HEIGHT,
        }}
        onDoubleClick={openEditor}
        title="双击打开剪辑台；选中后底部也会展开剪辑台"
      >
        {isEmpty ? (
          <div className="compose-node-strip__empty" aria-hidden>
            <span className="media-node__empty-icon">🎞️</span>
            <p className="compose-node-strip__empty-hint">{composeEmptyHint()}</p>
          </div>
        ) : (
          <>
            <div className="compose-node-strip__main">
              <div className="compose-node-strip__track" aria-hidden>
                {active.map((clip, index) => (
                  <span
                    key={clip.id}
                    className="compose-node-strip__pill"
                    style={{
                      flexGrow: composeClipFlexWeight(clip),
                      flexBasis: `${COMPOSE_PILL_MIN_WIDTH}px`,
                    }}
                    title={clip.name?.trim() || `片段 ${index + 1}`}
                  >
                    {composeClipLabel(clip, index)}
                  </span>
                ))}
              </div>
              {hasAudio && (
                <span className="compose-node-strip__audio-badge" aria-hidden title="已接入音频">
                  🎵
                </span>
              )}
            </div>
            <div className="compose-node-strip__footer-row">
              <p className="compose-node-strip__footer">{footer}</p>
              {hasExport && (
                <span className="compose-node-strip__export-badge" title="已导出成片">
                  ✓ 已导出
                </span>
              )}
            </div>
          </>
        )}

        {videoInputs.map(({ id: handleId, top, connected }) => (
          <Handle
            key={handleId}
            type="target"
            position={Position.Left}
            id={handleId}
            className={`compose-node-strip__handle ${
              connected ? 'compose-node-strip__handle--connected' : ''
            }`}
            style={{ top }}
          />
        ))}
        <Handle
          type="target"
          position={Position.Left}
          id="audio"
          className={`compose-node-strip__handle compose-node-strip__handle--audio ${
            connectedHandles.has('audio') || hasAudio
              ? 'compose-node-strip__handle--connected'
              : ''
          }`}
          style={{ top: '88%' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="composed"
          className="compose-node-strip__handle"
          style={{ top: '50%' }}
        />
      </div>
    </div>
  )
}

export const ComposeNode = memo(ComposeNodeComponent)

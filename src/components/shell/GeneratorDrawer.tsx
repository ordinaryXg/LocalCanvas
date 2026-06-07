import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'

import { useCanvasStore } from '../../stores/canvasStore'

import { useEditorShellStore } from '../../stores/editorShellStore'

import { useGeneratorHeaderStore } from '../../stores/generatorHeaderStore'

import { GENERATABLE_NODE_TYPES } from '../../constants/editorFeatures'
import { nodeDisplayTitle } from '../../utils/nodeNaming'

import { GeneratorContent } from '../panels/GeneratorContent'



const MIN_HEIGHT = 160



function drawerTitle(nodeType: string, data: Record<string, unknown>): string {

  switch (nodeType) {

    case 'image':

      return `🖼️ 图片 · ${nodeDisplayTitle({ type: 'image', data }, '图片')}`

    case 'video':

      return `🎥 视频 · ${nodeDisplayTitle({ type: 'video', data }, '视频')}`

    case 'text':

      return `📝 文本 · ${nodeDisplayTitle({ type: 'text', data }, '文本')}`

    case 'audio':

      return `🎵 音频 · ${(data.fileName as string) || '音频'}`

    case 'script':

      return `🎬 脚本`

    case 'storyboard':

      return `📋 分镜组`

    default:

      return nodeType

  }

}



export function GeneratorDrawer() {

  const nodes = useCanvasStore((s) => s.nodes)

  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds)

  const open = useEditorShellStore((s) => s.generatorDrawerOpen)

  const setOpen = useEditorShellStore((s) => s.setGeneratorDrawerOpen)

  const heightRatio = useEditorShellStore((s) => s.generatorDrawerHeightRatio)

  const setHeightRatio = useEditorShellStore((s) => s.setGeneratorDrawerHeightRatio)

  const mode = useEditorShellStore((s) => s.mode)

  const onGenerate = useGeneratorHeaderStore((s) => s.onGenerate)
  const onCancel = useGeneratorHeaderStore((s) => s.onCancel)
  const generateDisabled = useGeneratorHeaderStore((s) => s.generateDisabled)
  const isGenerating = useGeneratorHeaderStore((s) => s.isGenerating)
  const headerProgress = useGeneratorHeaderStore((s) => s.progress)

  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null)

  const [viewportH, setViewportH] = useState(() =>

    typeof window !== 'undefined' ? window.innerHeight : 800,

  )



  useEffect(() => {

    const onResize = () => setViewportH(window.innerHeight)

    window.addEventListener('resize', onResize)

    return () => window.removeEventListener('resize', onResize)

  }, [])



  useEffect(() => {

    const onMouseMove = (event: MouseEvent) => {

      if (!resizeRef.current) return

      const delta = resizeRef.current.startY - event.clientY

      const nextPx = resizeRef.current.startHeight + delta

      setHeightRatio(nextPx / viewportH)

    }

    const onMouseUp = () => {

      resizeRef.current = null

    }

    window.addEventListener('mousemove', onMouseMove)

    window.addEventListener('mouseup', onMouseUp)

    return () => {

      window.removeEventListener('mousemove', onMouseMove)

      window.removeEventListener('mouseup', onMouseUp)

    }

  }, [setHeightRatio, viewportH])



  const selectedNode = nodes.find(

    (n) => selectedNodeIds.includes(n.id) && GENERATABLE_NODE_TYPES.has(n.type ?? ''),

  )



  useEffect(() => {

    if (selectedNode && mode === 'canvas') {

      setOpen(true)

    }

  }, [selectedNode?.id, mode, setOpen])



  if (!open || !selectedNode) return null



  const panelHeight = Math.max(MIN_HEIGHT, viewportH * heightRatio)

  const nodeType = selectedNode.type ?? 'text'

  const nodeData = selectedNode.data as Record<string, unknown>

  const title = drawerTitle(nodeType, nodeData)

  const showGenerate = nodeType === 'image' && onGenerate



  const startResize = (event: ReactMouseEvent) => {

    event.preventDefault()

    resizeRef.current = { startY: event.clientY, startHeight: panelHeight }

  }



  return (

    <div

      className="absolute bottom-0 left-0 right-0 z-[80] flex flex-col bg-bg-secondary/95 backdrop-blur border-t border-[var(--studio-border)] shadow-[0_-8px_24px_rgba(0,0,0,0.3)]"

      style={{ height: panelHeight }}

    >

      <div

        role="separator"

        aria-orientation="horizontal"

        aria-label="调整生成器高度"

        onMouseDown={startResize}

        className="group h-2 shrink-0 cursor-ns-resize flex items-center justify-center hover:bg-[var(--studio-accent-muted)]"

      >

        <span className="w-10 h-1 rounded-full bg-border group-hover:bg-[var(--studio-accent)]" />

      </div>

      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0 gap-3">

        <span className="text-xs font-medium text-text-muted truncate">{title}</span>

        <div className="flex items-center gap-2 shrink-0">

          {showGenerate && (

            <>

              {isGenerating && onCancel && (

                <button

                  type="button"

                  onClick={() => onCancel()}

                  className="px-2 py-1 text-xs text-danger border border-danger/40 rounded hover:bg-danger/10"

                >

                  取消

                </button>

              )}

              <button

                type="button"

                onClick={() => onGenerate?.()}

                disabled={generateDisabled}

                className="px-4 py-1.5 bg-cyan-600 text-white text-xs rounded hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition"

              >

                {isGenerating

                  ? `生成中 ${headerProgress}%`

                  : '生成'}

              </button>

            </>

          )}

          <button

            type="button"

            onClick={() => setOpen(false)}

            className="text-xs text-text-muted hover:text-white"

          >

            关闭 ✕

          </button>

        </div>

      </div>

      <div className="flex-1 min-h-0 overflow-y-auto lc-scroll px-4 py-3">

        <GeneratorContent nodeId={selectedNode.id} nodeType={nodeType} embedded={false} />

      </div>

    </div>

  )

}


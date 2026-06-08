import { useEffect, useMemo } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'
import { useLazyAssetBlob } from '../../hooks/useLazyAssetBlob'
import { useProjectStore } from '../../stores/projectStore'
import { nodeDisplayTitle } from '../../utils/nodeNaming'
import { textNodeOutput } from '../../utils/textNodeOutput'
import { CurrentImagePreview } from './CurrentImagePreview'
import { CurrentVideoPreview } from './CurrentVideoPreview'

interface Props {
  nodeId: string
  nodeType: string
}

export function WorkbenchNodePreview({ nodeId, nodeType }: Props) {
  const node = useCanvasStore((s) => s.nodes.find((n) => n.id === nodeId))
  const data = (node?.data ?? {}) as Record<string, unknown>
  const title = useMemo(
    () => (node ? nodeDisplayTitle(node, nodeId) : nodeId),
    [node, nodeId],
  )

  if (!node) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-text-muted px-4 text-center">
        节点不存在
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-3 py-2 border-b border-[var(--studio-border)]">
        <p className="text-[10px] text-text-muted uppercase tracking-wide">预览</p>
        <p className="text-sm text-text-primary truncate" title={title}>
          {title}
        </p>
      </div>
      <div className="flex-1 min-h-0 p-3">
        {nodeType === 'image' && (
          <CurrentImagePreview
            imageSrc={data.imageSrc as string | undefined}
            imageAssetPath={data.imageAssetPath as string | undefined}
            fileName={title}
            isGenerating={data.isGenerating === true}
            progress={data.progress as number | undefined}
            height={undefined}
            minHeight={280}
          />
        )}
        {nodeType === 'video' && (
          <CurrentVideoPreview
            videoSrc={data.videoSrc as string | undefined}
            videoAssetPath={data.videoAssetPath as string | undefined}
            fileName={(data.fileName as string) || title}
            isGenerating={data.isGenerating === true}
            progress={data.progress as number | undefined}
            firstFrameSrc={data.firstFrameSrc as string | undefined}
            firstFrameAssetPath={data.firstFrameAssetPath as string | undefined}
          />
        )}
        {nodeType === 'text' && (
          <TextOutputPreview
            output={textNodeOutput(data)}
            isGenerating={data.isGenerating === true}
          />
        )}
        {nodeType === 'audio' && (
          <AudioOutputPreview
            audioSrc={data.audioSrc as string | undefined}
            audioAssetPath={data.audioAssetPath as string | undefined}
            isGenerating={data.isGenerating === true}
          />
        )}
        {(nodeType === 'script' || nodeType === 'storyboard') && (
          <GenericPreview
            hint={nodeType === 'script' ? '脚本生成结果将显示在右侧编辑器' : '分镜预览请在右侧编辑器查看'}
            isGenerating={data.isGenerating === true}
          />
        )}
      </div>
    </div>
  )
}

function TextOutputPreview({ output, isGenerating }: { output: string; isGenerating: boolean }) {
  return (
    <div className="h-full min-h-[280px] rounded-lg border border-border bg-bg-tertiary/40 flex flex-col overflow-hidden">
      {isGenerating ? (
        <div className="flex-1 flex items-center justify-center text-xs text-text-muted">生成中…</div>
      ) : output.trim() ? (
        <pre className="flex-1 overflow-y-auto lc-scroll p-3 text-xs text-text-primary whitespace-pre-wrap font-sans">
          {output}
        </pre>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-text-muted px-4 text-center">
          生成后将在此显示文本输出
        </div>
      )}
    </div>
  )
}

function AudioOutputPreview({
  audioSrc,
  audioAssetPath,
  isGenerating,
}: {
  audioSrc?: string
  audioAssetPath?: string
  isGenerating: boolean
}) {
  const projectId = useProjectStore((s) => s.currentProjectId)
  const hasAudio = !!(audioSrc || audioAssetPath)
  const { src, loading, load } = useLazyAssetBlob(projectId, audioAssetPath, audioSrc)

  useEffect(() => {
    if (audioAssetPath && !audioSrc) void load()
  }, [audioAssetPath, audioSrc, load])

  const displaySrc = audioSrc ?? src

  return (
    <div className="h-full min-h-[200px] rounded-lg border border-border bg-bg-tertiary/40 flex flex-col items-center justify-center gap-3 px-4">
      {isGenerating ? (
        <span className="text-xs text-text-muted">生成中…</span>
      ) : hasAudio ? (
        loading && !displaySrc ? (
          <span className="text-xs text-text-muted">加载中…</span>
        ) : displaySrc ? (
          <audio src={displaySrc} controls className="w-full max-w-sm" preload="metadata" />
        ) : (
          <span className="text-xs text-text-muted text-center">无法加载音频</span>
        )
      ) : (
        <span className="text-xs text-text-muted text-center">生成后将在此播放音频</span>
      )}
    </div>
  )
}

function GenericPreview({ hint, isGenerating }: { hint: string; isGenerating: boolean }) {
  return (
    <div className="h-full min-h-[200px] rounded-lg border border-dashed border-border/60 flex items-center justify-center px-4 text-center text-xs text-text-muted">
      {isGenerating ? '生成中…' : hint}
    </div>
  )
}

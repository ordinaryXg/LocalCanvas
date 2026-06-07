import { useEffect } from 'react'
import { useLazyAssetBlob } from '../../hooks/useLazyAssetBlob'
import { useProjectStore } from '../../stores/projectStore'

interface Props {
  imageSrc?: string
  imageAssetPath?: string
  fileName?: string
  isGenerating?: boolean
  progress?: number
  /** 固定高度（可拖拽调整）；未设则用 minHeight */
  height?: number
  minHeight?: number
  /** 最近输出 asset 路径（最多 3 条） */
  recentOutputs?: string[]
  onSelectRecent?: (assetPath: string) => void
}

export function CurrentImagePreview({
  imageSrc,
  imageAssetPath,
  fileName,
  isGenerating,
  progress,
  height,
  minHeight = 240,
  recentOutputs,
  onSelectRecent,
}: Props) {
  const projectId = useProjectStore((s) => s.currentProjectId)
  const { src, loading, load } = useLazyAssetBlob(projectId, imageAssetPath, imageSrc)

  useEffect(() => {
    if (imageAssetPath && !imageSrc) {
      void load()
    }
  }, [imageAssetPath, imageSrc, load])

  const displaySrc = imageSrc ?? src
  const hasImage = !!displaySrc

  const boxHeight = height ?? minHeight

  return (
    <div className="flex flex-col h-full min-w-0">
      <div
        className="flex-1 rounded-lg border border-border bg-bg-tertiary/40 flex items-center justify-center overflow-hidden relative h-full"
        style={{ minHeight: boxHeight }}
      >
        {hasImage ? (
          <img
            src={displaySrc}
            alt={fileName ?? '当前图片'}
            className="max-w-full max-h-full object-contain"
          />
        ) : loading ? (
          <span className="text-xs text-text-muted">加载中…</span>
        ) : (
          <div className="text-center text-text-muted text-xs px-4">
            <div className="text-3xl mb-2 opacity-60">🖼️</div>
            生成后将在此显示结果
          </div>
        )}
        {isGenerating && (
          <div className="absolute inset-x-0 bottom-0 px-3 pb-3">
            <div className="w-full bg-black/50 rounded-full h-1.5">
              <div
                className="bg-[var(--node-image)] h-1.5 rounded-full transition-all"
                style={{ width: `${progress ?? 0}%` }}
              />
            </div>
          </div>
        )}
      </div>
      {recentOutputs && recentOutputs.length > 1 && onSelectRecent && (
        <div className="shrink-0 mt-2 flex gap-1.5 overflow-x-auto">
          {recentOutputs.map((path) => (
            <button
              key={path}
              type="button"
              title={path.split('/').pop()}
              onClick={() => onSelectRecent(path)}
              className={`shrink-0 w-12 h-12 rounded border overflow-hidden ${
                path === imageAssetPath
                  ? 'border-[var(--studio-accent)]'
                  : 'border-border opacity-70 hover:opacity-100'
              }`}
            >
              <RecentThumb projectId={projectId} assetPath={path} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function RecentThumb({ projectId, assetPath }: { projectId: string | null; assetPath: string }) {
  const { src, load } = useLazyAssetBlob(projectId, assetPath)
  useEffect(() => {
    void load()
  }, [load])
  if (!src) return <div className="w-full h-full bg-bg-tertiary" />
  return <img src={src} alt="" className="w-full h-full object-cover" />
}

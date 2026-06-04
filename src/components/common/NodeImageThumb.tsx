import { useEffect } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'
import { useLazyAssetBlob } from '../../hooks/useLazyAssetBlob'

interface Props {
  projectId: string | null
  /** 从画布图片节点读取 */
  nodeId?: string
  src?: string
  assetPath?: string
  className?: string
  alt?: string
  placeholder?: string
}

/**
 * 显示节点/资产图片缩略图，支持仅有 assetPath 时按需加载。
 */
export function NodeImageThumb({
  projectId,
  nodeId,
  src,
  assetPath,
  className = 'w-full h-full object-cover',
  alt = '',
  placeholder = '🖼️',
}: Props) {
  const node = useCanvasStore((s) => (nodeId ? s.nodes.find((n) => n.id === nodeId) : undefined))
  const nodeData = node?.data as Record<string, unknown> | undefined

  const resolvedSrc =
    src ??
    (typeof nodeData?.imageSrc === 'string' ? nodeData.imageSrc : undefined) ??
    (typeof nodeData?.referenceSrc === 'string' ? nodeData.referenceSrc : undefined)
  const resolvedPath =
    assetPath ??
    (typeof nodeData?.imageAssetPath === 'string' ? nodeData.imageAssetPath : undefined) ??
    (typeof nodeData?.referenceAssetPath === 'string' ? nodeData.referenceAssetPath : undefined)

  const { src: blobSrc, load } = useLazyAssetBlob(projectId, resolvedPath, resolvedSrc)

  useEffect(() => {
    if (resolvedPath && !blobSrc && !resolvedSrc?.startsWith('blob:') && !resolvedSrc?.startsWith('data:')) {
      void load()
    }
  }, [resolvedPath, blobSrc, resolvedSrc, load])

  const displaySrc =
    blobSrc ??
    (resolvedSrc?.startsWith('blob:') || resolvedSrc?.startsWith('data:') || resolvedSrc?.startsWith('http')
      ? resolvedSrc
      : null)

  if (!displaySrc) {
    return (
      <div className={`flex items-center justify-center bg-bg-primary text-text-muted text-lg ${className}`}>
        {placeholder}
      </div>
    )
  }

  return <img src={displaySrc} alt={alt} className={className} />
}

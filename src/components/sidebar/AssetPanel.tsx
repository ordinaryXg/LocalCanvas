import { useState, useEffect, useCallback, useRef } from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { assetPathToBlobUrl } from '../../utils/assetStorage'
import type { AssetItem } from '../../types/ipc'
import { handleError } from '../../utils/ErrorHandler'

type FilterType = 'all' | 'image' | 'video' | 'audio'

const FILTER_LABELS: Record<FilterType, string> = {
  all: '全部',
  image: '🖼️',
  video: '🎥',
  audio: '🎵',
}

export function AssetPanel() {
  const projectId = useProjectStore((s) => s.currentProjectId)
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [loading, setLoading] = useState(false)

  const loadAssets = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const list = await window.api.asset.list(projectId)
      setAssets(list)
    } catch (error) {
      handleError(error, 'loadAssets')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void loadAssets()
  }, [loadAssets])

  const handleImport = async () => {
    if (!projectId) return
    const filePath = await window.api.file.selectFile([
      {
        name: '媒体文件',
        extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'mov', 'webm', 'mp3', 'wav', 'm4a'],
      },
    ])
    if (filePath) {
      try {
        await window.api.asset.import(projectId, filePath)
        await loadAssets()
      } catch (error) {
        handleError(error, 'importAsset')
      }
    }
  }

  const filteredAssets =
    filter === 'all' ? assets : assets.filter((a) => a.type === filter)

  const handleDragStart = async (e: React.DragEvent, asset: AssetItem) => {
    if (!projectId) return
    try {
      const blobUrl = await assetPathToBlobUrl(projectId, asset.path)
      e.dataTransfer.setData(
        'application/localcanvas',
        JSON.stringify({ ...asset, blobUrl }),
      )
    } catch (error) {
      handleError(error, 'assetDrag')
    }
  }

  if (!projectId) {
    return (
      <div className="p-3 text-xs text-text-muted">请先打开项目</div>
    )
  }

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1 flex-wrap">
          {(['all', 'image', 'video', 'audio'] as FilterType[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`text-[10px] px-2 py-0.5 rounded ${
                filter === f ? 'bg-accent text-white' : 'text-text-muted hover:text-white'
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void handleImport()}
          className="text-[10px] text-accent hover:underline"
        >
          + 导入
        </button>
      </div>

      {loading ? (
        <div className="text-[10px] text-text-muted text-center py-4">加载中...</div>
      ) : filteredAssets.length === 0 ? (
        <div className="text-[10px] text-text-muted text-center py-4">暂无资产，点击导入</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              draggable
              onDragStart={(e) => void handleDragStart(e, asset)}
              className="bg-bg-tertiary rounded p-2 cursor-grab hover:border-accent border border-transparent transition"
            >
              {asset.type === 'image' && (
                <AssetThumbnail projectId={projectId} asset={asset} />
              )}
              {asset.type === 'video' && (
                <VideoAssetThumbnail asset={asset} />
              )}
              {asset.type === 'audio' && (
                <div className="w-full h-16 bg-bg-primary rounded flex items-center justify-center text-lg">
                  🎵
                </div>
              )}
              <div className="text-[9px] text-text-muted mt-1 truncate">{asset.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function VideoAssetThumbnail({ asset }: { asset: AssetItem }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [src, setSrc] = useState<string>('')

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { rootMargin: '80px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    let revoked: string | null = null
    void (async () => {
      try {
        const thumbPath = await window.api.asset.thumbnail(asset.absolutePath)
        const buffer = await window.api.file.readAbsolutePath(thumbPath)
        const url = URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' }))
        revoked = url
        setSrc(url)
      } catch {
        setSrc('')
      }
    })()

    return () => {
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [visible, asset.absolutePath])

  if (!visible || !src) {
    return (
      <div
        ref={containerRef}
        className="w-full h-16 bg-bg-primary rounded flex items-center justify-center text-lg"
      >
        🎥
      </div>
    )
  }

  return (
    <div ref={containerRef}>
      <img src={src} alt={asset.name} className="w-full h-16 object-cover rounded" />
    </div>
  )
}

function AssetThumbnail({ projectId, asset }: { projectId: string; asset: AssetItem }) {
  const [src, setSrc] = useState<string>('')

  useEffect(() => {
    void assetPathToBlobUrl(projectId, asset.path).then(setSrc)
    return () => {
      if (src.startsWith('blob:')) URL.revokeObjectURL(src)
    }
  }, [projectId, asset.path])

  if (!src) {
    return <div className="w-full h-16 bg-bg-primary rounded animate-pulse" />
  }

  return <img src={src} alt={asset.name} className="w-full h-16 object-cover rounded" />
}

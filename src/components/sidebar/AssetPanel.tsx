import { useState, useEffect, useCallback, useRef } from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { assetPathToBlobUrl } from '../../utils/assetStorage'
import type { AssetItem } from '../../types/ipc'
import { handleError, showToast } from '../../utils/ErrorHandler'

type FilterType = 'all' | 'image' | 'video' | 'audio'

interface AssetContextMenuState {
  x: number
  y: number
  asset: AssetItem
}

const FILTER_LABELS: Record<FilterType, string> = {
  all: '全部',
  image: '🖼️',
  video: '🎥',
  audio: '🎵',
}

const ASSETS_PAGE_SIZE = 24

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AssetPanel() {
  const projectId = useProjectStore((s) => s.currentProjectId)
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [loading, setLoading] = useState(false)
  const [visibleCount, setVisibleCount] = useState(ASSETS_PAGE_SIZE)
  const [contextMenu, setContextMenu] = useState<AssetContextMenuState | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    const timer = window.setTimeout(() => {
      window.addEventListener('mousedown', close)
      window.addEventListener('scroll', close, true)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [contextMenu])

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

  const runAssetAction = async (action: () => Promise<void>) => {
    try {
      await action()
    } catch (error) {
      handleError(error, 'assetAction')
    } finally {
      setContextMenu(null)
    }
  }

  const filteredAssets =
    filter === 'all' ? assets : assets.filter((a) => a.type === filter)

  useEffect(() => {
    setVisibleCount(ASSETS_PAGE_SIZE)
  }, [filter, projectId, assets.length])

  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel || visibleCount >= filteredAssets.length) return

    const root = sentinel.closest('.lc-scroll') ?? null
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setVisibleCount((count) => Math.min(filteredAssets.length, count + ASSETS_PAGE_SIZE))
      },
      { root, rootMargin: '160px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [filteredAssets.length, visibleCount])

  const visibleAssets = filteredAssets.slice(0, visibleCount)
  const hasMore = visibleCount < filteredAssets.length

  if (!projectId) {
    return <div className="p-3 text-xs text-text-muted">请先打开项目</div>
  }

  return (
    <div className="p-3 relative">
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
        <div className="flex flex-col gap-2">
          {visibleAssets.map((asset) => (
            <div
              key={asset.id}
              draggable
              onDragStart={(e) => void handleDragStart(e, asset)}
              onContextMenu={(e) => {
                e.preventDefault()
                setContextMenu({ x: e.clientX, y: e.clientY, asset })
              }}
              className="flex gap-2 items-center bg-bg-tertiary rounded p-2 cursor-grab hover:border-accent border border-transparent transition"
            >
              <div className="w-16 h-16 shrink-0 rounded overflow-hidden bg-bg-primary">
                {asset.type === 'image' && (
                  <AssetThumbnail projectId={projectId} asset={asset} />
                )}
                {asset.type === 'video' && <VideoAssetThumbnail asset={asset} compact />}
                {asset.type === 'audio' && (
                  <div className="w-full h-full flex items-center justify-center text-lg">🎵</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-text-primary truncate" title={asset.name}>
                  {asset.name}
                </div>
                <div className="text-[9px] text-text-muted mt-0.5">{formatFileSize(asset.size)}</div>
              </div>
            </div>
          ))}
          {hasMore && (
            <div ref={loadMoreRef} className="text-[10px] text-text-muted text-center py-2">
              向下滚动加载更多…
            </div>
          )}
        </div>
      )}

      {contextMenu && (
        <AssetContextMenu
          menu={contextMenu}
          projectId={projectId}
          onClose={() => setContextMenu(null)}
          onDeleted={() => void loadAssets()}
          runAction={runAssetAction}
        />
      )}
    </div>
  )
}

function AssetContextMenu({
  menu,
  projectId,
  onClose,
  onDeleted,
  runAction,
}: {
  menu: AssetContextMenuState
  projectId: string
  onClose: () => void
  onDeleted: () => void
  runAction: (action: () => Promise<void>) => void
}) {
  const { asset } = menu

  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(asset.absolutePath)
      showToast('已复制文件路径', 'info')
      onClose()
    } catch {
      showToast('复制失败', 'error')
      onClose()
    }
  }

  return (
    <div
      className="fixed z-50 bg-bg-secondary border border-border rounded-lg shadow-xl py-1 min-w-[180px]"
      style={{ left: menu.x, top: menu.y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 border-b border-border/60 mb-1">
        <div className="text-[10px] text-text-primary truncate" title={asset.name}>
          {asset.name}
        </div>
        <div className="text-[9px] text-text-muted">{formatFileSize(asset.size)}</div>
      </div>

      <button
        type="button"
        className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary"
        onClick={() =>
          runAction(async () => {
            await window.api.asset.open(projectId, asset.path)
          })
        }
      >
        打开文件
      </button>
      <button
        type="button"
        className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary"
        onClick={() =>
          runAction(async () => {
            await window.api.asset.revealInFolder(projectId, asset.path)
          })
        }
      >
        在文件夹中显示
      </button>
      <button
        type="button"
        className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary"
        onClick={() =>
          runAction(async () => {
            await window.api.asset.openFolder(projectId, asset.path)
          })
        }
      >
        打开所在目录
      </button>
      <button
        type="button"
        className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary"
        onClick={() => void copyPath()}
      >
        复制路径
      </button>
      <button
        type="button"
        className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary"
        onClick={() =>
          runAction(async () => {
            await window.api.projectExtra.openDir(projectId)
          })
        }
      >
        打开项目文件夹
      </button>

      <div className="my-1 border-t border-border/60" />

      <button
        type="button"
        className="w-full text-left px-3 py-1.5 text-xs text-danger hover:bg-bg-tertiary"
        onClick={() => {
          if (!confirm(`确认删除「${asset.name}」？\n文件将从项目中移除且不可恢复。`)) {
            onClose()
            return
          }
          runAction(async () => {
            await window.api.asset.delete(projectId, asset.path)
            showToast('已删除资产', 'info')
            onDeleted()
          })
        }}
      >
        删除
      </button>
    </div>
  )
}

function VideoAssetThumbnail({ asset, compact = false }: { asset: AssetItem; compact?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [src, setSrc] = useState<string>('')

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const root = el.closest('.lc-scroll')
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { root, rootMargin: '120px' },
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

  const boxClass = compact
    ? 'w-full h-full flex items-center justify-center text-lg'
    : 'w-full h-16 bg-bg-primary rounded flex items-center justify-center text-lg'

  if (!visible || !src) {
    return (
      <div ref={containerRef} className={boxClass}>
        🎥
      </div>
    )
  }

  return (
    <div ref={containerRef} className={compact ? 'w-full h-full' : undefined}>
      <img
        src={src}
        alt={asset.name}
        className={compact ? 'w-full h-full object-cover' : 'w-full h-16 object-cover rounded'}
      />
    </div>
  )
}

function AssetThumbnail({ projectId, asset }: { projectId: string; asset: AssetItem }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [src, setSrc] = useState<string>('')

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const root = el.closest('.lc-scroll')
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { root, rootMargin: '120px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    let revoked = ''
    void assetPathToBlobUrl(projectId, asset.path).then((url) => {
      revoked = url
      setSrc(url)
    })
    return () => {
      if (revoked.startsWith('blob:')) URL.revokeObjectURL(revoked)
    }
  }, [visible, projectId, asset.path])

  if (!src) {
    return <div ref={containerRef} className="w-full h-full animate-pulse bg-bg-primary" />
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <img src={src} alt={asset.name} className="w-full h-full object-cover" />
    </div>
  )
}

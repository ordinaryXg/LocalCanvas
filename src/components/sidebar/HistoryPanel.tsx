import { useState, useEffect, useCallback, useRef } from 'react'
import type { GenerationRecord } from '../../types/ipc'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { generateNodeId } from '../../utils/id'
import { importGeneratedMedia, localPathToBlobUrl } from '../../utils/generatedMedia'
import { handleError } from '../../utils/ErrorHandler'
import { useT } from '../../i18n'
import { StatsPanel } from '../panels/StatsPanel'

type FilterType = 'all' | 'image' | 'video' | 'text'

const HISTORY_PAGE_SIZE = 20

export function HistoryPanel() {
  const t = useT()
  const [records, setRecords] = useState<GenerationRecord[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const addNode = useCanvasStore((s) => s.addNode)
  const viewport = useCanvasStore((s) => s.viewport)
  const currentProjectId = useProjectStore((s) => s.currentProjectId)

  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const list = await window.api.history.query({
        type: filter === 'all' ? undefined : filter,
        search: search.trim() || undefined,
      })
      setRecords(list)
    } catch (error) {
      handleError(error, 'historyLoad')
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => {
    void loadRecords()
  }, [loadRecords])

  useEffect(() => {
    setVisibleCount(HISTORY_PAGE_SIZE)
  }, [filter, search, records.length])

  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel || visibleCount >= records.length) return

    const root = sentinel.closest('.lc-scroll') ?? null
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setVisibleCount((count) => Math.min(records.length, count + HISTORY_PAGE_SIZE))
      },
      { root, rootMargin: '160px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [records.length, visibleCount])

  useEffect(() => {
    const unsubComplete = window.api.on('model:complete', () => {
      void loadRecords()
    })
    const unsubBatch = window.api.on('model:batchItemComplete', () => {
      void loadRecords()
    })
    return () => {
      unsubComplete()
      unsubBatch()
    }
  }, [loadRecords])

  const handleReuse = async (record: GenerationRecord) => {
    if (record.status !== 'completed') return

    const centerX = (-viewport.x + 400) / viewport.zoom
    const centerY = (-viewport.y + 300) / viewport.zoom
    const position = { x: centerX, y: centerY }
    const baseData = { prompt: record.prompt, modelId: record.modelId }

    try {
      if (record.type === 'text') {
        if (!record.outputPath) return
        addNode({
          id: generateNodeId('text'),
          type: 'text',
          position,
          data: {
            ...baseData,
            output: record.outputPath,
            outputMode: 'generated',
            draft: record.prompt,
          },
        })
        return
      }

      if (!record.outputPath) return

      if (record.type === 'image' || record.type === 'video' || record.type === 'audio') {
        const { src, assetPath, fileName } = await importGeneratedMedia(
          currentProjectId,
          record.type,
          record.outputPath,
        )
        const data: Record<string, unknown> = { ...baseData }
        if (record.type === 'image') {
          data.imageSrc = src
          if (assetPath) data.imageAssetPath = assetPath
          data.fileName = fileName
        } else if (record.type === 'video') {
          data.videoSrc = src
          if (assetPath) data.videoAssetPath = assetPath
        } else {
          data.audioSrc = src
          if (assetPath) data.audioAssetPath = assetPath
        }
        addNode({
          id: generateNodeId(record.type),
          type: record.type,
          position,
          data,
        })
      }
    } catch (error) {
      handleError(error, 'historyReuse')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await window.api.history.delete(id)
      await loadRecords()
    } catch (error) {
      handleError(error, 'historyDelete')
    }
  }

  const typeIcons: Record<string, string> = { image: '🖼️', video: '🎥', text: '📝', audio: '🔊' }
  const statusColors: Record<string, string> = {
    completed: 'text-green-400',
    failed: 'text-red-400',
    running: 'text-yellow-400',
  }

  const filterLabels: Record<FilterType, string> = {
    all: t('history.filterAll'),
    image: '🖼️',
    video: '🎥',
    text: '📝',
  }

  const visibleRecords = records.slice(0, visibleCount)
  const hasMore = visibleCount < records.length

  return (
    <div className="flex flex-col min-h-full">
      <StatsPanel />
      <div className="flex flex-col flex-1 min-h-0 p-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('history.searchPlaceholder')}
          className="w-full shrink-0 bg-bg-tertiary text-text-primary text-xs px-2 py-1.5 rounded outline-none mb-2 border border-border"
        />

        <div className="flex gap-1 mb-2 shrink-0">
          {(['all', 'image', 'video', 'text'] as FilterType[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`text-[10px] px-2 py-0.5 rounded ${
                filter === f ? 'bg-accent text-white' : 'text-text-muted'
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-[10px] text-text-muted text-center py-4">{t('history.loading')}</div>
        ) : records.length === 0 ? (
          <div className="text-center text-text-muted text-xs py-4">{t('history.empty')}</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {visibleRecords.map((r) => (
              <HistoryRecordRow
                key={r.id}
                record={r}
                typeIcon={typeIcons[r.type] ?? '·'}
                statusClass={statusColors[r.status] || 'text-text-muted'}
                onReuse={() => void handleReuse(r)}
                onDelete={() => void handleDelete(r.id)}
                reuseLabel={t('history.reuse')}
                deleteLabel={t('history.delete')}
              />
            ))}
            {hasMore && (
              <div ref={loadMoreRef} className="text-[10px] text-text-muted text-center py-2">
                {t('history.loadMore')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function HistoryRecordRow({
  record,
  typeIcon,
  statusClass,
  onReuse,
  onDelete,
  reuseLabel,
  deleteLabel,
}: {
  record: GenerationRecord
  typeIcon: string
  statusClass: string
  onReuse: () => void
  onDelete: () => void
  reuseLabel: string
  deleteLabel: string
}) {
  return (
    <div className="bg-bg-tertiary rounded p-2 hover:border-accent border border-transparent transition">
      {record.thumbnailPath && <HistoryThumbnail thumbnailPath={record.thumbnailPath} />}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs shrink-0">{typeIcon}</span>
          <span className="text-[10px] text-text-secondary truncate">{record.modelName}</span>
        </div>
        <span className={`text-[9px] shrink-0 ${statusClass}`}>{record.status}</span>
      </div>
      <div className="text-[9px] text-text-muted mt-1 truncate">{record.prompt}</div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[8px] text-text-muted">
          {new Date(record.createdAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        <div className="flex gap-2">
          {record.status === 'completed' && (
            <button type="button" onClick={onReuse} className="text-[9px] text-accent hover:underline">
              {reuseLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="text-[9px] text-text-muted hover:text-danger"
          >
            {deleteLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function HistoryThumbnail({ thumbnailPath }: { thumbnailPath: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [src, setSrc] = useState('')

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
    void localPathToBlobUrl(thumbnailPath).then((url) => {
      revoked = url
      setSrc(url)
    })
    return () => {
      if (revoked.startsWith('blob:')) URL.revokeObjectURL(revoked)
    }
  }, [visible, thumbnailPath])

  return (
    <div ref={containerRef} className="w-full h-16 rounded mb-1.5 bg-bg-secondary overflow-hidden">
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full animate-pulse bg-bg-primary" />
      )}
    </div>
  )
}

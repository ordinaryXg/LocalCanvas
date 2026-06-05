import { useState, useEffect, useCallback } from 'react'
import type { GenerationRecord } from '../../types/ipc'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { generateNodeId } from '../../utils/id'
import { importGeneratedMedia, localPathToBlobUrl } from '../../utils/generatedMedia'
import { handleError } from '../../utils/ErrorHandler'
import { useT } from '../../i18n'
import { StatsPanel } from '../panels/StatsPanel'

type FilterType = 'all' | 'image' | 'video' | 'text'

export function HistoryPanel() {
  const t = useT()
  const [records, setRecords] = useState<GenerationRecord[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const addNode = useCanvasStore((s) => s.addNode)
  const viewport = useCanvasStore((s) => s.viewport)
  const currentProjectId = useProjectStore((s) => s.currentProjectId)
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({})

  const loadRecords = useCallback(async () => {
    const list = await window.api.history.query({
      type: filter === 'all' ? undefined : filter,
      search: search.trim() || undefined,
    })
    setRecords(list)
  }, [filter, search])

  useEffect(() => {
    void loadRecords()
  }, [loadRecords])

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

  useEffect(() => {
    let cancelled = false
    const urls: string[] = []

    void (async () => {
      const next: Record<string, string> = {}
      for (const record of records) {
        if (!record.thumbnailPath) continue
        try {
          const url = await localPathToBlobUrl(record.thumbnailPath)
          if (cancelled) {
            URL.revokeObjectURL(url)
            continue
          }
          next[record.id] = url
          urls.push(url)
        } catch {
          /* ignore missing thumbnails */
        }
      }
      if (!cancelled) setThumbUrls(next)
    })()

    return () => {
      cancelled = true
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [records])

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
            generatedContent: record.outputPath,
            content: record.outputPath,
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

  return (
    <div>
      <StatsPanel />
      <div className="p-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('history.searchPlaceholder')}
          className="w-full bg-bg-tertiary text-text-primary text-xs px-2 py-1.5 rounded outline-none mb-2 border border-border"
        />

        <div className="flex gap-1 mb-2">
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

        <div className="space-y-1.5 max-h-[400px] overflow-y-auto lc-scroll">
          {records.map((r) => (
            <div
              key={r.id}
              className="bg-bg-tertiary rounded p-2 hover:border-accent border border-transparent transition"
            >
              {thumbUrls[r.id] && (
                <img
                  src={thumbUrls[r.id]}
                  alt=""
                  className="w-full h-16 object-cover rounded mb-1.5 bg-bg-secondary"
                />
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">{typeIcons[r.type]}</span>
                  <span className="text-[10px] text-text-secondary truncate max-w-[100px]">
                    {r.modelName}
                  </span>
                </div>
                <span className={`text-[9px] ${statusColors[r.status] || 'text-text-muted'}`}>
                  {r.status}
                </span>
              </div>
              <div className="text-[9px] text-text-muted mt-1 truncate">{r.prompt}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[8px] text-text-muted">
                  {new Date(r.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <div className="flex gap-2">
                  {r.status === 'completed' && (
                    <button
                      type="button"
                      onClick={() => void handleReuse(r)}
                      className="text-[9px] text-accent hover:underline"
                    >
                      {t('history.reuse')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDelete(r.id)}
                    className="text-[9px] text-text-muted hover:text-danger"
                  >
                    {t('history.delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {records.length === 0 && (
            <div className="text-center text-text-muted text-xs py-4">{t('history.empty')}</div>
          )}
        </div>
      </div>
    </div>
  )
}

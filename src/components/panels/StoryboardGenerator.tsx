import { useState } from 'react'
import { useStoryboardGroup } from '../../hooks/useStoryboardGroup'
import { syncStoryboardToCanvas } from '../../utils/storyboardSyncToCanvas'
import { useT } from '../../i18n'
import { useProjectStore } from '../../stores/projectStore'
import { handleError, showToast } from '../../utils/ErrorHandler'

interface StoryboardGeneratorProps {
  nodeId: string
}

export function StoryboardGenerator({ nodeId }: StoryboardGeneratorProps) {
  const t = useT()
  const projectId = useProjectStore((s) => s.currentProjectId)
  const {
    frames,
    selectedFrameIds,
    layout,
    setLayout,
    regenerateSelectedImages,
    regenerateSelectedVideos,
    generating,
  } = useStoryboardGroup(nodeId)
  const [exporting, setExporting] = useState<'png' | 'pdf' | null>(null)
  const [syncing, setSyncing] = useState(false)

  const handleExport = async (format: 'png' | 'pdf') => {
    if (!projectId || frames.length === 0) return
    setExporting(format)
    try {
      const result = await window.api.storyboard.export({
        projectId,
        format,
        layout,
        frames: frames.map((f) => ({
          sequence: f.sequence,
          description: f.description,
          imageAssetPath: f.imagePath,
        })),
      })
      showToast(t('storyboard.exportDone'), 'info')
      await window.api.storyboard.openOutputDir()
      void result
    } catch (err) {
      handleError(err, 'storyboardExport')
    } finally {
      setExporting(null)
    }
  }

  const handleExport4k = async () => {
    if (!projectId || selectedFrameIds.length !== 1) return
    const frame = frames.find((f) => f.id === selectedFrameIds[0])
    if (!frame?.imagePath) {
      handleError(new Error(t('storyboard.export4kNeedImage')), 'storyboardExport4k')
      return
    }
    setExporting('png')
    try {
      await window.api.storyboard.export({
        projectId,
        format: 'frame4k',
        frameSequence: frame.sequence,
        frames: [
          {
            sequence: frame.sequence,
            description: frame.description,
            imageAssetPath: frame.imagePath,
          },
        ],
      })
      showToast(t('storyboard.export4kDone'), 'info')
      await window.api.storyboard.openOutputDir()
    } catch (err) {
      handleError(err, 'storyboardExport4k')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="p-4 space-y-3 text-xs text-text-primary">
      <div className="font-medium">{t('storyboard.generatorTitle')}</div>
      <p className="text-text-muted">
        {frames.length} {t('storyboard.frames')} · {selectedFrameIds.length}{' '}
        {t('storyboard.selectedLabel')}
      </p>
      <div className="flex gap-2">
        {(['list', 'grid3', 'grid5'] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLayout(l)}
            className={`px-2 py-1 rounded border ${layout === l ? 'border-accent text-accent' : 'border-border'}`}
          >
            {t(`storyboard.layout.${l}`)}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!!generating || selectedFrameIds.length === 0}
        onClick={() => void regenerateSelectedImages()}
        className="w-full py-2 rounded bg-accent text-white disabled:opacity-50"
      >
        {generating === 'image' ? t('storyboard.regenerating') : t('storyboard.regenSelected')}
      </button>
      <button
        type="button"
        disabled={!!generating || selectedFrameIds.length === 0}
        onClick={() => void regenerateSelectedVideos()}
        className="w-full py-2 rounded border border-border hover:border-accent/50 disabled:opacity-50"
      >
        {generating === 'video' ? '视频生成中…' : '重生成选中帧（视频）'}
      </button>
      <button
        type="button"
        disabled={!!syncing || frames.length === 0 || !projectId}
        onClick={() => {
          if (!projectId) return
          setSyncing(true)
          void syncStoryboardToCanvas(nodeId, projectId)
            .then((n) => showToast(`已同步 ${n} 个图片节点到画布`, 'info'))
            .catch((err) => handleError(err, 'storyboardSync'))
            .finally(() => setSyncing(false))
        }}
        className="w-full py-2 rounded border border-[var(--studio-accent)] text-[var(--studio-accent)] hover:bg-[var(--studio-accent-muted)] disabled:opacity-50"
      >
        {syncing ? '同步中…' : '同步到画布'}
      </button>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!!exporting || frames.length === 0}
          onClick={() => void handleExport('png')}
          className="flex-1 py-1.5 rounded border border-border hover:border-accent/50 disabled:opacity-50"
        >
          {exporting === 'png' ? t('storyboard.exporting') : t('storyboard.exportPng')}
        </button>
        <button
          type="button"
          disabled={!!exporting || frames.length === 0}
          onClick={() => void handleExport('pdf')}
          className="flex-1 py-1.5 rounded border border-border hover:border-accent/50 disabled:opacity-50"
        >
          {exporting === 'pdf' ? t('storyboard.exporting') : t('storyboard.exportPdf')}
        </button>
      </div>
      <button
        type="button"
        disabled={!!exporting || selectedFrameIds.length !== 1}
        onClick={() => void handleExport4k()}
        className="w-full py-1.5 rounded border border-border text-text-muted hover:border-accent/50 disabled:opacity-50"
      >
        {t('storyboard.export4k')}
      </button>
    </div>
  )
}

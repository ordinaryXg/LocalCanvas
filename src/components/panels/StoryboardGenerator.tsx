import { useMemo, useState } from 'react'
import { useStoryboardGroup, inferStoryboardRegenKind } from '../../hooks/useStoryboardGroup'
import { syncStoryboardToCanvas } from '../../utils/storyboardSyncToCanvas'
import { StoryboardFrameBrowser } from './StoryboardFrameBrowser'
import { useT } from '../../i18n'
import { useProjectStore } from '../../stores/projectStore'
import { useCanvasStore } from '../../stores/canvasStore'
import { handleError, showToast } from '../../utils/ErrorHandler'
import { storyboardFailedFrames, storyboardSyncedFrameCount } from '../../utils/storyboardNodeDisplay'

interface StoryboardGeneratorProps {
  nodeId: string
}

const BTN =
  'w-full text-sm py-1.5 rounded transition disabled:opacity-50 bg-accent/15 text-accent border border-accent/35 hover:bg-accent/25'

export function StoryboardGenerator({ nodeId }: StoryboardGeneratorProps) {
  const t = useT()
  const projectId = useProjectStore((s) => s.currentProjectId)
  const {
    frames,
    selectedFrameIds,
    layout,
    setLayout,
    toggleFrameSelection,
    regenerateSelected,
    regenerateFrameImage,
    regenerateFrameVideo,
    retryAllFailedFrames,
    selectFrameTake,
    generating,
    progress,
  } = useStoryboardGroup(nodeId)
  const [exporting, setExporting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const syncedCount = storyboardSyncedFrameCount(frames)
  const failedFrames = storyboardFailedFrames(frames)

  const selectedFrames = useMemo(
    () => frames.filter((f) => selectedFrameIds.includes(f.id)),
    [frames, selectedFrameIds],
  )

  const regenKinds = useMemo(
    () =>
      selectedFrames
        .map((f) => inferStoryboardRegenKind(f))
        .filter((k): k is NonNullable<typeof k> => k !== null),
    [selectedFrames],
  )

  const regenLabel = useMemo(() => {
    if (generating === 'image') return t('storyboard.regenerating')
    if (generating === 'video') return `视频生成中${progress > 0 ? ` ${progress}%` : '…'}`
    if (regenKinds.length === 0) return '重生成选中帧'
    const allImage = regenKinds.every((k) => k === 'image')
    const allVideo = regenKinds.every((k) => k === 'video')
    if (allImage) return '🖼️ 重生成选中帧（图）'
    if (allVideo) return '🎥 重生成选中帧（视频）'
    return '重生成选中帧'
  }, [generating, progress, regenKinds, t])

  const handleExportPng = async () => {
    if (!projectId || frames.length === 0) return
    setExporting(true)
    try {
      const result = await window.api.storyboard.export({
        projectId,
        format: 'png',
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
      setExporting(false)
    }
  }

  const handleExport4k = async () => {
    if (!projectId || selectedFrameIds.length !== 1) return
    const frame = frames.find((f) => f.id === selectedFrameIds[0])
    if (!frame?.imagePath) {
      handleError(new Error(t('storyboard.export4kNeedImage')), 'storyboardExport4k')
      return
    }
    setExporting(true)
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
      setExporting(false)
    }
  }

  const handleSync = () => {
    if (!projectId) return
    setSyncing(true)
    void syncStoryboardToCanvas(nodeId, projectId)
      .then((created) => {
        const latest = useCanvasStore.getState().nodes.find((n) => n.id === nodeId)
        const latestFrames = (latest?.data.frames as typeof frames) ?? frames
        const synced = storyboardSyncedFrameCount(latestFrames)
        showToast(
          created > 0
            ? `已新建 ${created} 个图片节点（${synced}/${latestFrames.length} 帧已关联）`
            : `已更新画布关联（${synced}/${latestFrames.length} 帧已同步）`,
          'info',
        )
      })
      .catch((err) => handleError(err, 'storyboardSync'))
      .finally(() => setSyncing(false))
  }

  return (
    <div className="storyboard-generator">
      <div className="storyboard-generator__main">
        <div className="storyboard-generator__header">
          <div>
            <div className="font-medium text-sm text-text-primary">{t('storyboard.generatorTitle')}</div>
            <p className="mt-1 text-text-muted">
              {frames.length} {t('storyboard.frames')} · {selectedFrameIds.length}{' '}
              {t('storyboard.selectedLabel')}
              {syncedCount > 0 && ` · 已同步 ${syncedCount} 帧`}
            </p>
          </div>
          <div className="storyboard-generator__layout-tabs">
            {(['list', 'grid3', 'grid5'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLayout(l)}
                className={`storyboard-generator__layout-tab ${
                  layout === l ? 'storyboard-generator__layout-tab--active' : ''
                }`}
              >
                {t(`storyboard.layout.${l}`)}
              </button>
            ))}
          </div>
        </div>

        <StoryboardFrameBrowser
          nodeId={nodeId}
          frames={frames}
          layout={layout}
          selectedFrameIds={selectedFrameIds}
          generating={!!generating}
          onToggleSelect={toggleFrameSelection}
          onRetryImage={(frameId) => void regenerateFrameImage(frameId)}
          onRetryVideo={(frameId) => void regenerateFrameVideo(frameId)}
          onSelectTake={selectFrameTake}
          fillHeight
        />
      </div>

      <aside className="storyboard-generator__aside">
        <button
          type="button"
          disabled={!!generating || selectedFrameIds.length === 0}
          onClick={() => void regenerateSelected()}
          className={BTN}
        >
          {regenLabel}
        </button>
        <button
          type="button"
          disabled={!!syncing || frames.length === 0 || !projectId}
          onClick={handleSync}
          className={BTN}
        >
          {syncing ? '同步中…' : '同步到画布'}
        </button>

        <div className="storyboard-generator__aside-divider" />

        <button
          type="button"
          disabled={exporting || frames.length === 0}
          onClick={() => void handleExportPng()}
          className={BTN}
        >
          {exporting ? t('storyboard.exporting') : t('storyboard.exportPng')}
        </button>
        <button
          type="button"
          disabled={exporting || selectedFrameIds.length !== 1}
          onClick={() => void handleExport4k()}
          className={BTN}
        >
          {t('storyboard.export4k')}
        </button>

        {failedFrames.length > 0 && (
          <>
            <div className="storyboard-generator__aside-divider" />
            <button
              type="button"
              disabled={!!generating}
              onClick={() => void retryAllFailedFrames()}
              className={BTN}
            >
              重试全部失败帧（{failedFrames.length}）
            </button>
          </>
        )}

        {!!generating && progress > 0 && (
          <div className="w-full bg-accent/10 rounded-full h-1.5">
            <div
              className="bg-accent/60 h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </aside>
    </div>
  )
}

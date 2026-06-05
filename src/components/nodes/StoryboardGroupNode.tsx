import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { useStoryboardGroup } from '../../hooks/useStoryboardGroup'
import { useT } from '../../i18n'

function StoryboardGroupNodeComponent({ id, selected, width, height }: NodeProps) {
  const t = useT()
  const {
    frames,
    layout,
    selectedFrameIds,
    generating,
    setLayout,
    toggleFrameSelection,
    regenerateSelectedImages,
  } = useStoryboardGroup(id)

  const gridCols = layout === 'grid5' ? 5 : layout === 'grid3' ? 3 : 1

  return (
    <BaseNode
      color="var(--node-script)"
      icon={<span className="text-sm">🎞️</span>}
      title={t('storyboard.title')}
      selected={selected}
      width={width}
      height={height}
      defaultWidth={layout === 'list' ? 400 : layout === 'grid3' ? 360 : 480}
      minWidth={280}
      minHeight={240}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-2">
        <div className="flex gap-1 nodrag">
          {(['list', 'grid3', 'grid5'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLayout(l)}
              className={`text-[10px] px-2 py-0.5 rounded ${
                layout === l ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-muted'
              }`}
            >
              {t(`storyboard.layout.${l}`)}
            </button>
          ))}
        </div>

        {layout === 'list' ? (
          <div className="flex-1 min-h-0 max-h-[180px] overflow-y-auto lc-scroll nowheel space-y-1">
            {frames.map((f) => (
              <label
                key={f.id}
                className="flex items-start gap-2 text-[10px] p-1.5 rounded bg-bg-tertiary cursor-pointer hover:border-accent/50 border border-transparent"
              >
                <input
                  type="checkbox"
                  checked={selectedFrameIds.includes(f.id)}
                  onChange={() => toggleFrameSelection(f.id)}
                  className="mt-0.5 nodrag"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-text-primary font-medium">
                    #{f.sequence} {f.description || f.prompt.slice(0, 30)}
                  </div>
                  <div className="text-text-muted truncate">{f.prompt}</div>
                </div>
                <span className="text-[9px] text-text-muted shrink-0">{f.status}</span>
              </label>
            ))}
            {frames.length === 0 && (
              <p className="text-[10px] text-text-muted text-center py-4">{t('storyboard.empty')}</p>
            )}
          </div>
        ) : (
          <div
            className="grid gap-1.5 flex-1 min-h-0 overflow-y-auto lc-scroll nowheel nodrag"
            style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
          >
            {frames.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => toggleFrameSelection(f.id)}
                className={`aspect-square rounded border text-left p-1 overflow-hidden ${
                  selectedFrameIds.includes(f.id) ? 'border-accent ring-1 ring-accent' : 'border-border'
                }`}
              >
                {f.imageSrc ? (
                  <img src={f.imageSrc} alt="" className="w-full h-2/3 object-cover rounded mb-0.5" />
                ) : (
                  <div className="w-full h-2/3 bg-bg-tertiary rounded mb-0.5 flex items-center justify-center text-[9px] text-text-muted">
                    #{f.sequence}
                  </div>
                )}
                <div className="text-[8px] text-text-muted truncate">{f.description || f.prompt}</div>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          disabled={!!generating || selectedFrameIds.length === 0}
          onClick={() => void regenerateSelectedImages()}
          className="text-[10px] py-1 rounded bg-cyan-600/30 text-cyan-300 hover:bg-cyan-600/50 disabled:opacity-50 nodrag"
        >
          {generating === 'image' ? t('storyboard.regenerating') : t('storyboard.regenSelected')}
        </button>
      </div>
    </BaseNode>
  )
}

export const StoryboardGroupNode = memo(StoryboardGroupNodeComponent)

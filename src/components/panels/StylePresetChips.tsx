import { forwardRef, useImperativeHandle, useRef } from 'react'
import { STYLE_PRESETS, buildEffectivePromptPreview, buildEffectiveNegative } from '../../constants/stylePresets'
import { useI18nStore } from '../../i18n'
import { findScrollParent, scrollElementWithinContainer } from '../../utils/scrollWithin'

export interface StylePresetChipsHandle {
  focus: () => void
}

interface Props {
  styleId: string
  prompt: string
  negativePrompt: string
  onStyleChange: (styleId: string) => void
  recommendedModelId?: string
  recommendedModelName?: string
  currentModelId?: string
  onApplyRecommendedModel?: (modelId: string) => void
}

export const StylePresetChips = forwardRef<StylePresetChipsHandle, Props>(function StylePresetChips(
  {
    styleId,
    prompt,
    negativePrompt,
    onStyleChange,
    recommendedModelId,
    recommendedModelName,
    currentModelId,
    onApplyRecommendedModel,
  },
  ref,
) {
  const locale = useI18nStore((s) => s.locale)
  const rootRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    focus: () => {
      const root = rootRef.current
      if (!root) return
      const scrollParent = findScrollParent(root)
      if (scrollParent) scrollElementWithinContainer(scrollParent, root)
      root.classList.add('ring-1', 'ring-[var(--studio-accent)]')
      window.setTimeout(() => {
        root.classList.remove('ring-1', 'ring-[var(--studio-accent)]')
      }, 1200)
    },
  }))

  const effectivePrompt = buildEffectivePromptPreview(prompt, styleId)
  const effectiveNegative = buildEffectiveNegative(negativePrompt, styleId)
  const showRecommended =
    recommendedModelId && recommendedModelId !== currentModelId && onApplyRecommendedModel

  return (
    <div ref={rootRef} className="space-y-1.5 rounded transition-shadow">
      <label className="text-[10px] text-text-muted">风格</label>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => onStyleChange('')}
          className={`px-2 py-0.5 rounded-full text-[10px] border transition ${
            !styleId
              ? 'bg-[var(--studio-accent-muted)] border-[var(--studio-accent)] text-white'
              : 'border-border text-text-muted hover:border-text-muted'
          }`}
        >
          无
        </button>
        {STYLE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onStyleChange(p.id)}
            className={`px-2 py-0.5 rounded-full text-[10px] border transition ${
              styleId === p.id
                ? 'bg-[var(--studio-accent-muted)] border-[var(--studio-accent)] text-white'
                : 'border-border text-text-muted hover:border-text-muted'
            }`}
          >
            {locale === 'en-US' ? p.nameEn : p.name}
          </button>
        ))}
      </div>
      {showRecommended && (
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <span>推荐模型：{recommendedModelName ?? recommendedModelId}</span>
          <button
            type="button"
            onClick={() => onApplyRecommendedModel(recommendedModelId)}
            className="text-[var(--studio-accent)] hover:underline"
          >
            应用
          </button>
        </div>
      )}
      {styleId && effectivePrompt !== prompt && (
        <div className="rounded bg-bg-tertiary/60 p-2 space-y-1">
          <div className="text-[9px] text-text-muted">生效正向 prompt</div>
          <p className="text-[10px] text-text-secondary break-all line-clamp-3">{effectivePrompt}</p>
          {effectiveNegative !== negativePrompt && (
            <>
              <div className="text-[9px] text-text-muted pt-0.5">追加负向</div>
              <p className="text-[10px] text-text-muted break-all line-clamp-2">{effectiveNegative}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
})

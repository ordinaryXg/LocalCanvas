import { InspectorSection } from './InspectorSection'

interface Props {
  warningCount: number
  onView: () => void
}

export function InspectorHealth({ warningCount, onView }: Props) {
  if (warningCount <= 0) return null

  return (
    <InspectorSection title="健康">
      <button
        type="button"
        onClick={onView}
        className="w-full text-left text-[10px] text-amber-200 border border-amber-500/30 rounded px-2 py-1.5 hover:bg-amber-500/10"
      >
        ⚠ {warningCount} 条能力警告 · 查看
      </button>
    </InspectorSection>
  )
}

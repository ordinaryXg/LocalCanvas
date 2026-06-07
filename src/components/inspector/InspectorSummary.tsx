import type { ReactNode } from 'react'
import { InspectorSection } from './InspectorSection'

interface Props {
  lines: ReactNode[]
}

export function InspectorSummary({ lines }: Props) {
  const visible = lines.filter(Boolean)
  if (visible.length === 0) return null

  return (
    <InspectorSection title="摘要">
      <div className="space-y-1.5 rounded-lg border border-border/60 bg-bg-tertiary/20 p-2.5 text-xs">
        {visible.map((line, i) => (
          <div key={i} className="text-text-primary break-all">
            {line}
          </div>
        ))}
      </div>
    </InspectorSection>
  )
}

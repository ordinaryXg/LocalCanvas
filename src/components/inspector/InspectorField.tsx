import type { ReactNode } from 'react'

export function InspectorField({ label, value }: { label: string; value: ReactNode }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex justify-between gap-2 text-xs">
      <span className="text-text-muted shrink-0">{label}</span>
      <span className="text-text-primary text-right break-all">{value}</span>
    </div>
  )
}

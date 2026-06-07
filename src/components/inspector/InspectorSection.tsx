import type { ReactNode } from 'react'

export function InspectorSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-[10px] uppercase tracking-wide text-text-muted font-medium">{title}</h4>
      {children}
    </section>
  )
}

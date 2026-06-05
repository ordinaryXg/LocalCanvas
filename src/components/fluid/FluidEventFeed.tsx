import type { FluidEvent } from '../../types/fluid'

export function FluidEventFeed({ events }: { events: FluidEvent[] }) {
  return (
    <div className="w-60 border-l border-border bg-bg-secondary/30 p-2 overflow-y-auto text-xs">
      <div className="text-text-muted mb-2 font-medium">流体事件</div>
      {events.length === 0 && <p className="text-text-muted">暂无</p>}
      {events.map((e) => (
        <div key={e.id} className="py-1 border-b border-border/50 text-text-muted">
          <span className="text-[10px] opacity-70">{e.createdAt.slice(11, 16)}</span>{' '}
          {e.eventName}
        </div>
      ))}
    </div>
  )
}

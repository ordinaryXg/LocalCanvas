import type { ResonanceSource } from '../../types/fluid'

interface Props {
  sources: ResonanceSource[]
  onGravityChange: (id: string, gravity: number) => void
}

export function TuningOrbit({ sources, onGravityChange }: Props) {
  const size = 280
  const cx = size / 2
  const cy = size / 2

  return (
    <svg width={size} height={size} className="mx-auto">
      <circle cx={cx} cy={cy} r={28} fill="rgba(139,92,246,0.5)" className="animate-pulse" />
      {sources.map((s, i) => {
        const maxR = 100
        const r = maxR * (1 - s.gravity * 0.85)
        const angle = (i / Math.max(sources.length, 1)) * Math.PI * 2
        const x = cx + Math.cos(angle) * r
        const y = cy + Math.sin(angle) * r
        return (
          <g key={s.id}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(113,113,122,0.5)" strokeDasharray="4 4" />
            <circle
              cx={x}
              cy={y}
              r={12}
              fill={s.summary.colorHex}
              stroke="rgba(251,191,36,0.6)"
              strokeWidth={2}
              className="cursor-grab"
              onPointerDown={(e) => {
                const startY = e.clientY
                const startG = s.gravity
                const move = (ev: PointerEvent) => {
                  const delta = (startY - ev.clientY) / 200
                  onGravityChange(s.id, Math.max(0.05, Math.min(1, startG + delta)))
                }
                const up = () => {
                  window.removeEventListener('pointermove', move)
                  window.removeEventListener('pointerup', up)
                }
                window.addEventListener('pointermove', move)
                window.addEventListener('pointerup', up)
              }}
            />
            <text x={x} y={y - 16} textAnchor="middle" className="fill-text-muted text-[9px]">
              {s.summary.metaphor.slice(0, 8)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

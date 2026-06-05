import { useBreathStore } from '../../stores/breathStore'
import { FLUID_UI } from '../../constants/fluidFeatures'

export function BreathOverlay() {
  const phase = useBreathStore((s) => s.phase)
  if (!FLUID_UI || phase === 'idle') return null

  if (phase === 'hold') {
    return (
      <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
        <div className="w-[40%] h-px bg-white/35 animate-pulse" />
        <p className="absolute bottom-24 text-sm text-text-muted">一起等一等…</p>
      </div>
    )
  }

  if (phase === 'inhale') {
    return (
      <div
        className="pointer-events-none fixed inset-0 z-40 animate-pulse"
        style={{ boxShadow: 'inset 0 0 80px rgba(251, 191, 36, 0.08)' }}
      />
    )
  }

  return null
}

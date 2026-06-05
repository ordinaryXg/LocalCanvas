import type { FluidState } from '../../types/fluid'

interface Props {
  state: FluidState
  onPatch: (patch: Partial<FluidState>) => void
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col items-center gap-1 h-40">
      <span className="text-[10px] text-text-muted writing-mode-vertical">{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-28 w-8 accent-violet-500"
        style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
      />
      <span className="text-[10px] text-text-muted">{value.toFixed(2)}</span>
    </div>
  )
}

export function FluidSliders({ state, onPatch }: Props) {
  return (
    <div className="flex gap-3 p-3 border-r border-border bg-bg-secondary/50">
      <Slider label="温度" value={state.temperature} onChange={(temperature) => onPatch({ temperature, userTemperatureOverride: temperature })} />
      <Slider label="粘度" value={state.viscosity} onChange={(viscosity) => onPatch({ viscosity })} />
      <Slider label="张力" value={state.surfaceTension} onChange={(surfaceTension) => onPatch({ surfaceTension })} />
    </div>
  )
}

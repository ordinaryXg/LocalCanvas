interface Props {
  temperature: number
  warmSession?: boolean
}

export function FluidFogView({ temperature, warmSession }: Props) {
  const hue = 220 - temperature * 185
  const sat = 20 + temperature * 35
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 50% 50%, hsl(${hue} ${sat}% 45% / 0.35), transparent 70%)`,
      }}
    >
      {warmSession && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-text-muted/60">项目仍热</span>
        </div>
      )}
    </div>
  )
}

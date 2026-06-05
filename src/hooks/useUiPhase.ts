import { useMemo } from 'react'
import { useFluidStore } from '../stores/fluidStore'
import { useProjectStore } from '../stores/projectStore'
import type { FluidPhase } from '../types/fluid'

export function useUiPhase(): FluidPhase {
  const fluid = useFluidStore((s) => s.state)
  const projectId = useProjectStore((s) => s.currentProjectId)

  return useMemo(() => {
    if (!fluid || !projectId) return 'explore'
    if (fluid.crystallizedShotIds.length > 3) return 'freeze'
    if (fluid.temperature > 0.6) return 'explore'
    if (fluid.phase === 'converge') return 'converge'
    return fluid.temperature > 0.35 ? 'converge' : 'freeze'
  }, [fluid, projectId])
}

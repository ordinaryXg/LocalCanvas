import { useEffect, useRef } from 'react'
import { useBreathStore } from '../stores/breathStore'
import { fluidBus } from '../lib/fluidBus'
import { FLUID_UI, FLUID_PROBE } from '../constants/fluidFeatures'
import { useProjectStore } from '../stores/projectStore'

const INHALE_MS = 3000

export function useBreathCycle() {
  const setPhase = useBreathStore((s) => s.setPhase)
  const projectId = useProjectStore((s) => s.currentProjectId)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!FLUID_UI) return

    const onInput = () => {
      setPhase('inhale')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        setPhase('hold')
        if (FLUID_PROBE && projectId) {
          void window.api.probe.notifyChange(projectId)
        }
      }, INHALE_MS)
    }

    const unsub = fluidBus.subscribe((ev) => {
      if (ev.type === 'resonance:patched' || ev.type === 'affect:patched') onInput()
      if (ev.type === 'probe:ready') setPhase('exhale')
    })

    return () => {
      unsub()
      if (timer.current) clearTimeout(timer.current)
    }
  }, [setPhase, projectId])
}

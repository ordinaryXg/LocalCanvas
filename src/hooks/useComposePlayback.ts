import { useCallback, useEffect, useRef, useState } from 'react'

export function useComposePlayback(totalDuration: number) {
  const [playheadTime, setPlayheadTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const rafRef = useRef<number>()
  const lastTsRef = useRef<number>()

  const seek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(time, totalDuration))
      setPlayheadTime(clamped)
    },
    [totalDuration],
  )

  const toggle = useCallback(() => {
    setIsPlaying((p) => {
      if (p) return false
      setPlayheadTime((t) => (t >= totalDuration - 0.05 ? 0 : t))
      return true
    })
  }, [totalDuration])
  const pause = useCallback(() => setIsPlaying(false), [])
  const play = useCallback(() => setIsPlaying(true), [])

  useEffect(() => {
    if (!isPlaying) {
      lastTsRef.current = undefined
      return
    }

    const tick = (ts: number) => {
      if (lastTsRef.current != null) {
        const dt = (ts - lastTsRef.current) / 1000
        setPlayheadTime((prev) => {
          const next = prev + dt
          if (next >= totalDuration) {
            setIsPlaying(false)
            return totalDuration
          }
          return next
        })
      }
      lastTsRef.current = ts
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastTsRef.current = undefined
    }
  }, [isPlaying, totalDuration])

  useEffect(() => {
    if (playheadTime > totalDuration) {
      setPlayheadTime(totalDuration)
    }
  }, [playheadTime, totalDuration])

  return { playheadTime, isPlaying, seek, toggle, pause, play, setPlayheadTime }
}

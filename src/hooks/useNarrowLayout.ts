import { useEffect, useState } from 'react'

/** 窄屏布局（默认 <1280px），用于 Inspector 浮层等响应式壳层行为 */
export function useNarrowLayout(breakpointPx = 1280): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpointPx : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`)
    const onChange = () => setNarrow(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [breakpointPx])

  return narrow
}

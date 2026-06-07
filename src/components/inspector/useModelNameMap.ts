import { useEffect, useState } from 'react'

export function useModelNameMap() {
  const [map, setMap] = useState<Record<string, string>>({})
  useEffect(() => {
    void window.api.config.read().then((cfg) => {
      const next: Record<string, string> = {}
      for (const m of cfg.image_models) next[m.id] = m.name
      for (const m of cfg.video_models) next[m.id] = m.name
      for (const m of cfg.llm_models) next[m.id] = m.name
      for (const m of cfg.tts_models) next[m.id] = m.name
      setMap(next)
    })
  }, [])
  return map
}

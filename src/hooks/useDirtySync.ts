import { useEffect } from 'react'
import { useProjectStore } from '../stores/projectStore'

export function useDirtySync(): void {
  const isDirty = useProjectStore((s) => s.isDirty)

  useEffect(() => {
    void window.api.app.setDirty(isDirty)
  }, [isDirty])
}

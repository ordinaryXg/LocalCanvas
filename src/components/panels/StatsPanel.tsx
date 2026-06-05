import { useState, useEffect } from 'react'
import type { GenerationStats } from '../../types/ipc'
import { useT } from '../../i18n'

export function StatsPanel() {
  const t = useT()
  const [stats, setStats] = useState<GenerationStats | null>(null)

  useEffect(() => {
    void window.api.history.getStats().then(setStats)
    const unsub = window.api.on('model:complete', () => {
      void window.api.history.getStats().then(setStats)
    })
    return unsub
  }, [])

  if (!stats) return null

  return (
    <div className="grid grid-cols-5 gap-2 p-3 border-b border-border">
      <StatCard value={stats.total} label={t('stats.total')} />
      <StatCard value={stats.images} label={t('stats.images')} color="text-cyan-400" />
      <StatCard value={stats.videos} label={t('stats.videos')} color="text-rose-400" />
      <StatCard value={stats.texts} label={t('stats.texts')} color="text-purple-400" />
      <StatCard value={stats.failed} label={t('stats.failed')} color="text-red-400" />
    </div>
  )
}

function StatCard({
  value,
  label,
  color = 'text-white',
}: {
  value: number
  label: string
  color?: string
}) {
  return (
    <div className="bg-bg-tertiary rounded p-2 text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[9px] text-text-muted">{label}</div>
    </div>
  )
}

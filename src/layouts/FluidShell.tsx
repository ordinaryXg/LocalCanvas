import { useEffect, useState } from 'react'
import { Canvas } from '../components/canvas/Canvas'
import { Sidebar } from '../components/sidebar/Sidebar'
import { FluidFogView } from '../components/fluid/FluidFogView'
import { FluidSliders } from '../components/fluid/FluidSliders'
import { FluidEventFeed } from '../components/fluid/FluidEventFeed'
import { PhaseSwitcher } from '../components/fluid/PhaseSwitcher'
import { ResonancePanel } from '../components/resonance/ResonancePanel'
import { AffectTerrainEditor } from '../components/affect/AffectTerrainEditor'
import { ChorusPanel } from '../components/chorus/ChorusPanel'
import { PalimpsestStrataPanel } from '../components/palimpsest/PalimpsestStrataPanel'
import { BreathOverlay } from '../components/breath/BreathOverlay'
import { GhostPreviewCard } from '../components/probe/GhostPreviewCard'
import { useFluidStore } from '../stores/fluidStore'
import { useProjectStore } from '../stores/projectStore'
import { useUiPhase } from '../hooks/useUiPhase'
import { useBreathCycle } from '../hooks/useBreathCycle'
import { useFluidCompiler } from '../hooks/useFluidCompiler'
import type { FluidPhase } from '../types/fluid'
import { useBreathStore } from '../stores/breathStore'

interface FluidShellProps {
  onBack: () => void
  onOpenSettings: () => void
  onToggleTheme: () => void
  theme: 'dark' | 'light'
}

export function FluidShell({ onBack, onOpenSettings, onToggleTheme, theme }: FluidShellProps) {
  const projectId = useProjectStore((s) => s.currentProjectId)
  const projectName = useProjectStore((s) => s.projectName)
  const fluidState = useFluidStore((s) => s.state)
  const events = useFluidStore((s) => s.events)
  const load = useFluidStore((s) => s.load)
  const patch = useFluidStore((s) => s.patch)
  const clear = useFluidStore((s) => s.clear)
  const autoPhase = useUiPhase()
  const [manualPhase, setManualPhase] = useState<FluidPhase | null>(null)
  const [basementVisible, setBasementVisible] = useState(false)
  const [leftTab, setLeftTab] = useState<'resonance' | 'chorus' | 'palimpsest'>('resonance')
  const { syncBindings } = useFluidCompiler()

  const phase = manualPhase ?? autoPhase

  useBreathCycle()

  useEffect(() => {
    if (!projectId) return
    void load(projectId)
    void syncBindings()
    return () => {
      void window.api.fluid.endSession(projectId)
      clear()
    }
  }, [projectId, load, clear, syncBindings])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '`' && !e.ctrlKey && !e.metaKey) {
        const t = e.target as HTMLElement
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return
        setBasementVisible((v) => !v)
      }
      if (e.key === 'h' || e.key === 'H') {
        const t = e.target as HTMLElement
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return
        useBreathStore.getState().forceHold()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (basementVisible) {
    return (
      <div className="w-screen h-screen flex bg-bg-primary overflow-hidden">
        <Sidebar onBack={onBack} onOpenSettings={onOpenSettings} onToggleTheme={onToggleTheme} theme={theme} />
        <main className="flex-1 min-w-0 relative flex flex-col">
          <div className="px-3 py-1 text-xs text-text-muted border-b border-border flex gap-2">
            <button type="button" onClick={() => setBasementVisible(false)} className="hover:text-white">
              客厅
            </button>
            <span>›</span>
            <span>地下室</span>
          </div>
          <Canvas />
        </main>
      </div>
    )
  }

  const warmSession =
    !!fluidState?.lastSessionEndedAt &&
    Date.now() - new Date(fluidState.lastSessionEndedAt).getTime() < 86400000

  return (
    <div className="w-screen h-screen flex flex-col bg-bg-primary overflow-hidden">
      <header className="h-10 flex items-center justify-between px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="text-xs text-text-muted hover:text-white">
            ← 返回
          </button>
          <span className="text-sm text-text-primary">{projectName}</span>
        </div>
        <PhaseSwitcher phase={phase} onSelect={setManualPhase} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBasementVisible(true)}
            className="text-xs text-text-muted hover:text-white"
            title="下潜引擎 (`)"
          >
            地下室 `
          </button>
          <button type="button" onClick={onOpenSettings} className="text-xs text-text-muted hover:text-white">
            设置
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0 relative">
        <aside className="w-72 border-r border-border flex flex-col shrink-0">
          <div className="flex border-b border-border text-xs">
            {(['resonance', 'chorus', 'palimpsest'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setLeftTab(tab)}
                className={`flex-1 py-2 ${leftTab === tab ? 'text-violet-400 border-b border-violet-400' : 'text-text-muted'}`}
              >
                {tab === 'resonance' ? '共鸣' : tab === 'chorus' ? '合唱团' : '地层'}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {leftTab === 'resonance' && <ResonancePanel />}
            {leftTab === 'chorus' && <ChorusPanel />}
            {leftTab === 'palimpsest' && <PalimpsestStrataPanel />}
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 relative">
          {fluidState && <FluidFogView temperature={fluidState.temperature} warmSession={warmSession} />}
          {phase === 'explore' && <AffectTerrainEditor />}
          {phase === 'converge' && (
            <div className="flex-1 flex items-center justify-center text-text-muted text-sm p-8">
              收敛相：在地下室选中视频节点，使用叠加态胶片与生成并追加。
            </div>
          )}
          {phase === 'freeze' && (
            <div className="flex-1 flex items-center justify-center text-text-muted text-sm p-8">
              冻结相：打开地下室使用合成剪辑台导出（结晶检查已接入 API）。
            </div>
          )}
        </main>

        <div className="flex shrink-0">
          {fluidState && (
            <FluidSliders
              state={fluidState}
              onPatch={(p) => projectId && void patch(projectId, p)}
            />
          )}
          <FluidEventFeed events={events} />
        </div>
      </div>

      <BreathOverlay />
      <GhostPreviewCard />
    </div>
  )
}

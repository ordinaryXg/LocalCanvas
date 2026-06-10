import { lazy, Suspense } from 'react'
import { TopBar } from '../components/shell/TopBar'
import { Dock } from '../components/shell/Dock'
import { Inspector } from '../components/shell/Inspector'
import { EditorCoachMark } from '../components/shell/EditorCoachMark'
import { ShortcutsOverlay } from '../components/shell/ShortcutsOverlay'
import { CanvasMode } from './modes/CanvasMode'

const WorkbenchMode = lazy(() =>
  import('./modes/WorkbenchMode').then((m) => ({ default: m.WorkbenchMode })),
)
const SettingsPanel = lazy(() =>
  import('../components/panels/SettingsPanel').then((m) => ({ default: m.SettingsPanel })),
)
const AgentCompanion = lazy(() =>
  import('../components/agent/AgentCompanion').then((m) => ({ default: m.AgentCompanion })),
)
import { useEditorShellStore } from '../stores/editorShellStore'
import { useEditorShellShortcuts } from '../hooks/useEditorShellShortcuts'
import { useWorkbenchTarget } from '../hooks/useWorkbenchTarget'
import { useNarrowLayout } from '../hooks/useNarrowLayout'
import { isEditorCoachEnabled } from '../constants/editorFeatures'

interface EditorShellProps {
  onBack: () => void
}

function EditorLoading() {
  return (
    <div className="flex-1 flex items-center justify-center text-text-muted text-sm">加载中…</div>
  )
}

export function EditorShell({ onBack }: EditorShellProps) {
  useEditorShellShortcuts()
  const mode = useEditorShellStore((s) => s.mode)
  const settingsOpen = useEditorShellStore((s) => s.settingsOpen)
  const setSettingsOpen = useEditorShellStore((s) => s.setSettingsOpen)
  const narrowLayout = useNarrowLayout(1280)
  const workbenchTarget = useWorkbenchTarget()
  const hideInspector = mode === 'workbench' && workbenchTarget?.kind === 'compose'
  const hideDock = hideInspector

  return (
    <div className="editor-shell w-screen h-screen flex flex-col overflow-hidden bg-[var(--studio-bg)]">
      <TopBar onBack={onBack} />
      <div className="flex-1 min-h-0 flex">
        {!hideDock && <Dock />}
        <div className="flex-1 min-w-0 relative flex flex-col min-h-0 overflow-hidden">
          {settingsOpen ? (
            <Suspense fallback={<EditorLoading />}>
              <SettingsPanel onClose={() => setSettingsOpen(false)} />
            </Suspense>
          ) : (
            <>
              {mode === 'canvas' && <CanvasMode />}
              {mode === 'workbench' && (
                <Suspense fallback={<EditorLoading />}>
                  <div className="flex-1 min-h-0 editor-shell-mode-enter">
                    <WorkbenchMode />
                  </div>
                </Suspense>
              )}
            </>
          )}
        </div>
        {!hideInspector && <Inspector overlay={narrowLayout} />}
        <Suspense fallback={null}>
          <AgentCompanion />
        </Suspense>
      </div>
      {isEditorCoachEnabled() && !settingsOpen && <EditorCoachMark />}
      <ShortcutsOverlay />
    </div>
  )
}

import { TopBar } from '../components/shell/TopBar'
import { Dock } from '../components/shell/Dock'
import { Inspector } from '../components/shell/Inspector'
import { GeneratorDrawer } from '../components/shell/GeneratorDrawer'
import { EditorCoachMark } from '../components/shell/EditorCoachMark'
import { ShortcutsOverlay } from '../components/shell/ShortcutsOverlay'
import { AgentCompanion } from '../components/agent/AgentCompanion'
import { CanvasMode } from './modes/CanvasMode'
import { GenerateMode } from './modes/GenerateMode'
import { EditMode } from './modes/EditMode'
import { useEditorShellStore } from '../stores/editorShellStore'
import { useEditorShellShortcuts } from '../hooks/useEditorShellShortcuts'
import { isEditorCoachEnabled } from '../constants/editorFeatures'

interface EditorShellProps {
  onBack: () => void
  onOpenSettings: () => void
}

export function EditorShell({ onBack, onOpenSettings }: EditorShellProps) {
  useEditorShellShortcuts()
  const mode = useEditorShellStore((s) => s.mode)

  return (
    <div className="editor-shell w-screen h-screen flex flex-col overflow-hidden bg-[var(--studio-bg)]">
      <TopBar onBack={onBack} onOpenSettings={onOpenSettings} />
      <div className="flex-1 min-h-0 flex">
        <Dock />
        <div className="flex-1 min-w-0 relative flex flex-col min-h-0">
          {mode === 'canvas' && <CanvasMode />}
          {mode === 'generate' && <GenerateMode />}
          {mode === 'edit' && <EditMode />}
          {mode === 'canvas' && <GeneratorDrawer />}
        </div>
        {mode !== 'edit' && <Inspector />}
        <AgentCompanion />
      </div>
      {isEditorCoachEnabled() && <EditorCoachMark />}
      <ShortcutsOverlay />
    </div>
  )
}

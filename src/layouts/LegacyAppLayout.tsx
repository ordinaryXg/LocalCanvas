import { Canvas } from '../components/canvas/Canvas'
import { Sidebar } from '../components/sidebar/Sidebar'

interface LegacyAppLayoutProps {
  onBack: () => void
  onOpenSettings: () => void
  onToggleTheme: () => void
  theme: 'dark' | 'light'
}

export function LegacyAppLayout({
  onBack,
  onOpenSettings,
  onToggleTheme,
  theme,
}: LegacyAppLayoutProps) {
  return (
    <div className="w-screen h-screen flex bg-bg-primary overflow-hidden">
      <Sidebar
        onBack={onBack}
        onOpenSettings={onOpenSettings}
        onToggleTheme={onToggleTheme}
        theme={theme}
      />
      <main className="flex-1 min-w-0 relative">
        <Canvas />
      </main>
    </div>
  )
}

import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import { StartPage } from './components/project/StartPage'
import { OnboardingGuide } from './components/panels/OnboardingGuide'
import { ConfirmDialog } from './components/common/ConfirmDialog'

const EditorShell = lazy(() =>
  import('./layouts/EditorShell').then((m) => ({ default: m.EditorShell })),
)
const LegacyAppLayout = lazy(() =>
  import('./layouts/LegacyAppLayout').then((m) => ({ default: m.LegacyAppLayout })),
)
const SettingsPanel = lazy(() =>
  import('./components/panels/SettingsPanel').then((m) => ({ default: m.SettingsPanel })),
)

function EditorLoading() {
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-bg-primary text-text-muted text-sm">
      加载编辑器…
    </div>
  )
}
import { isEditorShell } from './constants/editorFeatures'
import { useCanvasStore } from './stores/canvasStore'
import { useProjectStore } from './stores/projectStore'
import { useThemeStore } from './stores/themeStore'
import { useDirtySync } from './hooks/useDirtySync'
import { useManualSave } from './hooks/useAutoSave'
import { useT, useI18nStore } from './i18n'
import { AuthGate } from './components/auth/AuthGate'
import { useUserStore } from './stores/userStore'
import { handleError, setToastHandler } from './utils/ErrorHandler'
import { hydrateProbedProfileCache } from './capabilities/load-probed-profiles'
import { hydrateProjectNodes } from './utils/assetStorage'
import type { Node, Edge } from '@xyflow/react'

type AppView = 'start' | 'editor'

function Toast({ message, type }: { message: string; type: 'error' | 'info' }) {
  return (
    <div
      className={`fixed bottom-4 right-4 z-[100] px-4 py-2 rounded-lg text-sm shadow-lg ${
        type === 'error' ? 'bg-danger text-white' : 'bg-bg-secondary text-white border border-border'
      }`}
    >
      {message}
    </div>
  )
}

export default function App() {
  const t = useT()
  const [view, setView] = useState<AppView>('start')
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'info' } | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  const loadProject = useCanvasStore((s) => s.loadProject)
  const { setCurrentProject, clearProject, isDirty } = useProjectStore()
  const { theme, toggleTheme } = useThemeStore()
  const locale = useI18nStore((s) => s.locale)
  const manualSave = useManualSave()

  useDirtySync()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    setToastHandler((message, type) => {
      setToast({ message, type })
      setTimeout(() => setToast(null), 4000)
    })
  }, [])

  useEffect(() => {
    void hydrateProbedProfileCache()
  }, [])

  const currentProjectId = useProjectStore((s) => s.currentProjectId)

  useEffect(() => {
    void window.api.app.setActiveProject(currentProjectId)
  }, [currentProjectId])

  useEffect(() => {
    void window.api.app.setLocale(locale)
  }, [locale])

  const setAuth = useUserStore((s) => s.setAuth)
  const setAuthReady = useUserStore((s) => s.setAuthReady)

  useEffect(() => {
    void window.api.auth.getSession().then((result) => {
      setAuth(result.user, result.isGuest)
      setAuthReady(true)
    })
    void window.api.dag.recover()
  }, [setAuth, setAuthReady])

  useEffect(() => {
    void window.api.config.needsOnboarding().then((needs) => {
      if (needs) setShowOnboarding(true)
    })
  }, [])

  useEffect(() => {
    const unsub = window.api.on('app:requestSave', () => {
      void manualSave().then(() => {
        void window.api.app.quitConfirmed()
      })
    })
    return unsub
  }, [manualSave])

  const openProject = useCallback(
    async (id: string, name: string) => {
      try {
        const data = await window.api.project.load(id)
        const nodes = await hydrateProjectNodes(id, data.nodes as Node[])
        loadProject(nodes, data.edges as Edge[], data.viewport)
        setCurrentProject(id, name)
        setView('editor')
      } catch (error) {
        handleError(error, 'openProject')
      }
    },
    [loadProject, setCurrentProject],
  )

  const backToStart = () => {
    if (isDirty) {
      setShowLeaveConfirm(true)
      return
    }
    clearProject()
    useCanvasStore.getState().loadProject([], [])
    setView('start')
  }

  const confirmLeave = () => {
    clearProject()
    useCanvasStore.getState().loadProject([], [])
    setView('start')
    setShowLeaveConfirm(false)
  }

  if (view === 'start') {
    return (
      <AuthGate>
        <StartPage
          onOpenProject={(id, name) => void openProject(id, name)}
          onOpenSettings={() => setShowSettings(true)}
        />
        {showOnboarding && <OnboardingGuide onComplete={() => setShowOnboarding(false)} />}
        {showSettings && (
          <Suspense fallback={null}>
            <SettingsPanel onClose={() => setShowSettings(false)} />
          </Suspense>
        )}
        {toast && <Toast {...toast} />}
      </AuthGate>
    )
  }

  return (
    <AuthGate>
      <Suspense fallback={<EditorLoading />}>
        {isEditorShell() ? (
          <EditorShell onBack={backToStart} onOpenSettings={() => setShowSettings(true)} />
        ) : (
          <LegacyAppLayout
            onBack={backToStart}
            onOpenSettings={() => setShowSettings(true)}
            onToggleTheme={toggleTheme}
            theme={theme}
          />
        )}
      </Suspense>
      {showOnboarding && <OnboardingGuide onComplete={() => setShowOnboarding(false)} />}
      {showSettings && (
        <Suspense fallback={null}>
          <SettingsPanel onClose={() => setShowSettings(false)} />
        </Suspense>
      )}
      {showLeaveConfirm && (
        <ConfirmDialog
          title={t('app.unsavedTitle')}
          message={t('app.unsavedMessage')}
          onSave={() => {
            void manualSave().then(confirmLeave)
          }}
          onDiscard={confirmLeave}
          onCancel={() => setShowLeaveConfirm(false)}
        />
      )}
      {toast && <Toast {...toast} />}
    </AuthGate>
  )
}

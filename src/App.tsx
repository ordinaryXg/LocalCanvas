import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react'
import { StartPage } from './components/project/StartPage'
import { OnboardingGuide } from './components/panels/OnboardingGuide'
import { ConfirmDialog } from './components/common/ConfirmDialog'
import { useCanvasStore } from './stores/canvasStore'
import { useProjectStore } from './stores/projectStore'
import { useThemeStore } from './stores/themeStore'
import { useDirtySync } from './hooks/useDirtySync'
import { useManualSave } from './hooks/useAutoSave'
import { useT, useI18nStore } from './i18n'
import { AuthGate } from './components/auth/AuthGate'
import { useUserStore } from './stores/userStore'
import { handleError, setToastHandler, showToast } from './utils/ErrorHandler'
import { hydrateProbedProfileCache } from './capabilities/load-probed-profiles'
import { getCatalogVersion } from './capabilities/profile-display'
import { hydrateProjectNodes } from './utils/assetStorage'
import type { Node, Edge } from '@xyflow/react'

const EditorShell = lazy(() =>
  import('./layouts/EditorShell').then((m) => ({ default: m.EditorShell })),
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

type AppView = 'start' | 'editor'

const EDITOR_SESSION_KEY = 'lc-editor-session'

function persistEditorSession(projectId: string, projectName: string): void {
  try {
    sessionStorage.setItem(EDITOR_SESSION_KEY, JSON.stringify({ projectId, projectName }))
  } catch {
    /* ignore quota / private mode */
  }
}

function clearEditorSession(): void {
  try {
    sessionStorage.removeItem(EDITOR_SESSION_KEY)
  } catch {
    /* ignore */
  }
}

const TOAST_DURATION_MS = { error: 10_000, info: 5_000 } as const

function Toast({ message, type }: { message: string; type: 'error' | 'info' }) {
  return (
    <div
      className={`fixed bottom-4 right-4 z-[100] max-w-md px-4 py-2.5 rounded-lg text-sm shadow-lg ${
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
  const [recoveredRuns, setRecoveredRuns] = useState<Array<{ id: string; projectId: string }> | null>(
    null,
  )

  const loadProject = useCanvasStore((s) => s.loadProject)
  const { setCurrentProject, clearProject, isDirty } = useProjectStore()
  const { theme } = useThemeStore()
  const locale = useI18nStore((s) => s.locale)
  const manualSave = useManualSave()
  const sessionRestoredRef = useRef(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useDirtySync()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    setToastHandler((message, type) => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      setToast({ message, type })
      toastTimerRef.current = setTimeout(() => {
        setToast(null)
        toastTimerRef.current = null
      }, TOAST_DURATION_MS[type])
    })
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
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
    void window.api.dag.recover().then((runs) => {
      if (runs.length > 0) setRecoveredRuns(runs)
    })
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
        setCurrentProject(id, name, data.metadata)
        persistEditorSession(id, name)
        setView('editor')

        const pinnedVersion = (data as { capabilityCatalogVersion?: number }).capabilityCatalogVersion
        const currentCatalog = getCatalogVersion()
        if (pinnedVersion != null && pinnedVersion < currentCatalog) {
          showToast(
            `能力目录已从 v${pinnedVersion} 升级到 v${currentCatalog}，建议在设置中对已接入模型重新「验证能力」。`,
            'info',
          )
        }
      } catch (error) {
        handleError(error, 'openProject')
      }
    },
    [loadProject, setCurrentProject],
  )

  useEffect(() => {
    if (sessionRestoredRef.current) return
    sessionRestoredRef.current = true
    try {
      const raw = sessionStorage.getItem(EDITOR_SESSION_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { projectId?: string; projectName?: string }
      if (!parsed.projectId) return
      void openProject(parsed.projectId, parsed.projectName || '未命名项目')
    } catch {
      clearEditorSession()
    }
  }, [openProject])

  const backToStart = () => {
    if (isDirty) {
      setShowLeaveConfirm(true)
      return
    }
    clearProject()
    useCanvasStore.getState().loadProject([], [])
    clearEditorSession()
    setView('start')
  }

  const confirmLeave = () => {
    clearProject()
    useCanvasStore.getState().loadProject([], [])
    clearEditorSession()
    setView('start')
    setShowLeaveConfirm(false)
  }

  const dismissRecoveredRuns = () => setRecoveredRuns(null)

  const abandonRecoveredRuns = () => {
    if (!recoveredRuns) return
    void Promise.all(
      recoveredRuns.map((run) =>
        window.api.dag.updateRun({ dagRunId: run.id, status: 'cancelled' }),
      ),
    ).finally(dismissRecoveredRuns)
  }

  if (view === 'start') {
    return (
      <AuthGate>
        {showSettings ? (
          <div className="w-screen h-screen flex flex-col overflow-hidden bg-[var(--studio-bg)]">
            <header
              className="shrink-0 flex items-center gap-3 px-3 border-b border-[var(--studio-border)] bg-bg-secondary"
              style={{ height: 'var(--space-topbar)' }}
            >
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-sm text-text-muted hover:text-white px-2 py-1 rounded hover:bg-[var(--studio-surface-hover)]"
              >
                ←
              </button>
              <span className="text-sm font-semibold text-text-primary">LocalCanvas</span>
              <span className="text-text-muted">·</span>
              <span className="text-sm text-text-primary">{t('settings.title')}</span>
            </header>
            <div className="flex-1 min-h-0">
              <Suspense fallback={<EditorLoading />}>
                <SettingsPanel onClose={() => setShowSettings(false)} />
              </Suspense>
            </div>
          </div>
        ) : (
          <>
            <StartPage
              onOpenProject={(id, name) => void openProject(id, name)}
              onOpenSettings={() => setShowSettings(true)}
            />
            {showOnboarding && <OnboardingGuide onComplete={() => setShowOnboarding(false)} />}
          </>
        )}
        {toast && <Toast {...toast} />}
        {recoveredRuns && recoveredRuns.length > 0 && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60">
            <div className="bg-bg-secondary border border-border rounded-xl p-5 w-96 shadow-xl">
              <h3 className="text-sm font-semibold text-text-primary mb-2">{t('dag.recoverTitle')}</h3>
              <p className="text-xs text-text-muted mb-4">
                {t('dag.recoverMessage').replace('{{count}}', String(recoveredRuns.length))}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={dismissRecoveredRuns}
                  className="text-xs py-2 rounded bg-accent text-white"
                >
                  {t('dag.recoverContinue')}
                </button>
                <button
                  type="button"
                  onClick={abandonRecoveredRuns}
                  className="text-xs py-2 rounded bg-bg-tertiary text-text-primary"
                >
                  {t('dag.recoverAbandon')}
                </button>
              </div>
            </div>
          </div>
        )}
      </AuthGate>
    )
  }

  return (
    <AuthGate>
      <Suspense fallback={<EditorLoading />}>
        <EditorShell onBack={backToStart} />
      </Suspense>
      {showOnboarding && <OnboardingGuide onComplete={() => setShowOnboarding(false)} />}
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
      {recoveredRuns && recoveredRuns.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60">
          <div className="bg-bg-secondary border border-border rounded-xl p-5 w-96 shadow-xl">
            <h3 className="text-sm font-semibold text-text-primary mb-2">{t('dag.recoverTitle')}</h3>
            <p className="text-xs text-text-muted mb-4">
              {t('dag.recoverMessage').replace('{{count}}', String(recoveredRuns.length))}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={dismissRecoveredRuns}
                className="text-xs py-2 rounded bg-accent text-white"
              >
                {t('dag.recoverContinue')}
              </button>
              <button
                type="button"
                onClick={abandonRecoveredRuns}
                className="text-xs py-2 rounded bg-bg-tertiary text-text-primary"
              >
                {t('dag.recoverAbandon')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGate>
  )
}

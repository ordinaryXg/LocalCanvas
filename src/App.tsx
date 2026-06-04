import { useState, useCallback, useEffect } from 'react'
import { StartPage } from './components/project/StartPage'
import { Canvas } from './components/canvas/Canvas'
import { Sidebar } from './components/sidebar/Sidebar'
import { useCanvasStore } from './stores/canvasStore'
import { useProjectStore } from './stores/projectStore'
import { handleError, setToastHandler } from './utils/ErrorHandler'
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
  const [view, setView] = useState<AppView>('start')
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'info' } | null>(null)

  const loadProject = useCanvasStore((s) => s.loadProject)
  const { setCurrentProject, clearProject } = useProjectStore()

  useEffect(() => {
    setToastHandler((message, type) => {
      setToast({ message, type })
      setTimeout(() => setToast(null), 4000)
    })
  }, [])

  const openProject = useCallback(
    async (id: string, name: string) => {
      try {
        const data = await window.api.project.load(id)
        loadProject(
          data.nodes as Node[],
          data.edges as Edge[],
          data.viewport,
        )
        setCurrentProject(id, name)
        setView('editor')
      } catch (error) {
        handleError(error, 'openProject')
      }
    },
    [loadProject, setCurrentProject],
  )

  const backToStart = () => {
    clearProject()
    useCanvasStore.getState().loadProject([], [])
    setView('start')
  }

  if (view === 'start') {
    return (
      <>
        <StartPage onOpenProject={(id, name) => void openProject(id, name)} />
        {toast && <Toast {...toast} />}
      </>
    )
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-bg-primary overflow-hidden">
      <header className="h-10 shrink-0 flex items-center px-3 border-b border-border bg-bg-secondary">
        <button
          type="button"
          onClick={backToStart}
          className="text-xs text-text-primary/80 hover:text-white mr-4"
        >
          ← 返回项目列表
        </button>
        <span className="text-xs text-text-muted">LocalCanvas v0.1</span>
      </header>
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <Canvas />
        </main>
      </div>
      {toast && <Toast {...toast} />}
    </div>
  )
}

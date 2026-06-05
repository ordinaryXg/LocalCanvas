import { useState, useEffect, useCallback } from 'react'
import { ProjectCard } from './ProjectCard'
import type { ProjectSummary } from '../../types/project'
import { handleError } from '../../utils/ErrorHandler'
import { useT } from '../../i18n'
import { AccountMenu } from '../common/AccountMenu'

interface StartPageProps {
  onOpenProject: (id: string, name: string) => void
  onOpenSettings?: () => void
}

export function StartPage({ onOpenProject, onOpenSettings }: StartPageProps) {
  const t = useT()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    try {
      const list = await window.api.project.list()
      setProjects(list)
    } catch (error) {
      handleError(error, 'loadProjects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const handleCreate = async () => {
    if (!newName.trim() || creating) return
    setCreating(true)
    try {
      const project = await window.api.project.create(newName.trim())
      onOpenProject(project.id, project.name)
    } catch (error) {
      handleError(error, 'createProject')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('start.deleteConfirm'))) return
    try {
      await window.api.project.delete(id)
      await loadProjects()
    } catch (error) {
      handleError(error, 'deleteProject')
    }
  }

  const handleRename = async (id: string, name: string) => {
    try {
      await window.api.projectExtra.rename(id, name)
      await loadProjects()
    } catch (error) {
      handleError(error, 'renameProject')
    }
  }

  const handleOpenDir = async (id: string) => {
    try {
      await window.api.projectExtra.openDir(id)
    } catch (error) {
      handleError(error, 'openProjectDir')
    }
  }

  const reorderProjects = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    const next = [...projects]
    const fromIndex = next.findIndex((p) => p.id === sourceId)
    const toIndex = next.findIndex((p) => p.id === targetId)
    if (fromIndex < 0 || toIndex < 0) return

    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setProjects(next)

    try {
      await window.api.project.reorder(next.map((p) => p.id))
    } catch (error) {
      handleError(error, 'reorderProjects')
      await loadProjects()
    }
  }

  return (
    <div className="w-full h-full bg-bg-primary flex items-center justify-center">
      <div className="w-[640px] px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">LocalCanvas</h1>
            <p className="text-text-primary/80">{t('app.tagline')}</p>
          </div>
          <div className="flex items-center gap-2">
            <AccountMenu />
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-sm text-text-muted hover:text-white px-3 py-2 rounded-lg border border-border hover:border-accent/50"
              >
                {t('app.modelSettings')}
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-8">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('start.placeholder')}
            className="flex-1 bg-bg-secondary text-white px-4 py-2 rounded-lg outline-none border border-border focus:border-accent"
            onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating || !newName.trim()}
            className="bg-accent text-white px-6 py-2 rounded-lg hover:bg-accent-hover transition disabled:opacity-50"
          >
            {creating ? t('start.creating') : t('start.create')}
          </button>
        </div>

        <h2 className="text-sm text-text-primary/90 mb-3">{t('start.recent')}</h2>
        <p className="text-[10px] text-text-muted mb-2">{t('start.dragHint')}</p>

        {loading ? (
          <div className="text-center text-text-muted py-8">{t('start.loading')}</div>
        ) : projects.length === 0 ? (
          <div className="text-center text-text-muted py-8">{t('start.empty')}</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {projects.map((p) => (
              <div
                key={p.id}
                draggable
                onDragStart={() => setDraggingId(p.id)}
                onDragEnd={() => setDraggingId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggingId) void reorderProjects(draggingId, p.id)
                  setDraggingId(null)
                }}
                className={draggingId === p.id ? 'opacity-50' : ''}
              >
                <ProjectCard
                  project={p}
                  onOpen={(id) => onOpenProject(id, p.name)}
                  onDelete={handleDelete}
                  onRename={handleRename}
                  onOpenDir={handleOpenDir}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

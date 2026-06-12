import { useState, useEffect, useCallback } from 'react'
import { ProjectCard } from './ProjectCard'
import type { ProjectSummary } from '../../types/project'
import { handleError, showToast } from '../../utils/ErrorHandler'
import { useT } from '../../i18n'
import { AccountMenu } from '../common/AccountMenu'
import { remapWorkflowToCanvas } from '../../utils/loadWorkflow'
import { buildProjectSavePayload } from '../../utils/projectPayload'

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
  const [importingProject, setImportingProject] = useState(false)

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

  const PRESET_TEMPLATES = [
    { label: '空白画布', name: '未命名项目', workflowName: null as string | null },
    { label: '分镜组', name: '分镜项目', workflowName: '脚本 → 分镜 → 批量视频' },
    { label: '文本→视频', name: '文本视频链路', workflowName: '文生图 → 图生视频' },
  ] as const

  const handleCreate = async (nameOverride?: string, workflowName?: string | null) => {
    const name = (nameOverride ?? newName).trim() || t('start.defaultName')
    if (creating || importingProject) return
    setCreating(true)
    try {
      const project = await window.api.project.create(name)
      if (workflowName) {
        const list = await window.api.workflow.list(true)
        const wf = list.find((w) => w.name === workflowName)
        if (wf) {
          const data = await window.api.workflow.load(wf.id)
          const { nodes, edges } = remapWorkflowToCanvas(
            data.nodes as Parameters<typeof remapWorkflowToCanvas>[0],
            data.edges as Parameters<typeof remapWorkflowToCanvas>[1],
          )
          const payload = buildProjectSavePayload({
            id: project.id,
            name: project.name,
            viewport: { x: 0, y: 0, zoom: 1 },
            nodes,
            edges,
          })
          await window.api.project.save(JSON.stringify(payload))
        }
      }
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

  const handleOpenFromFile = async () => {
    if (importingProject || creating) return
    setImportingProject(true)
    try {
      const result = await window.api.project.importFromFile()
      if (!result.success || !result.project) return
      await loadProjects()
      showToast(t('start.importSuccess'), 'success')
      onOpenProject(result.project.id, result.project.name)
    } catch (error) {
      handleError(error, 'importProject')
      showToast(t('start.importFailed'), 'error')
    } finally {
      setImportingProject(false)
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
    <div className="w-full h-full flex items-center justify-center bg-[var(--studio-bg)]">
      <div className="w-[720px] max-w-full px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">LocalCanvas</h1>
            <p className="text-text-primary/80">{t('app.tagline')}</p>
            <p className="text-xs text-text-muted mt-2">本地工作室 · 画布编排 · 一键生成</p>
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

        <div className="flex gap-2 mb-6 flex-wrap">
          {PRESET_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              disabled={creating || importingProject}
              onClick={() => {
                setNewName(tpl.name)
                void handleCreate(tpl.name, tpl.workflowName)
              }}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--studio-border)] text-text-muted hover:text-white hover:border-[var(--studio-accent)] transition disabled:opacity-50"
            >
              {tpl.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('start.placeholder')}
            className="flex-1 min-w-[220px] bg-bg-secondary text-white px-4 py-2 rounded-lg outline-none border border-border focus:border-accent"
            onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
          />
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleOpenFromFile()}
              disabled={creating || importingProject}
              className="px-5 py-2 rounded-lg border border-border text-text-primary hover:text-white hover:border-accent/50 transition disabled:opacity-50 whitespace-nowrap"
            >
              {importingProject ? t('start.openDialog.importing') : t('start.open')}
            </button>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating || importingProject}
              className="bg-accent text-white px-6 py-2 rounded-lg hover:bg-accent-hover transition disabled:opacity-50 whitespace-nowrap"
            >
              {creating ? t('start.creating') : t('start.create')}
            </button>
          </div>
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

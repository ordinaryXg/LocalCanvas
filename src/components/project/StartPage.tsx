import { useState, useEffect, useCallback } from 'react'
import { ProjectCard } from './ProjectCard'
import type { ProjectSummary } from '../../types/project'
import { handleError } from '../../utils/ErrorHandler'

interface StartPageProps {
  onOpenProject: (id: string, name: string) => void
}

export function StartPage({ onOpenProject }: StartPageProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

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
    if (!confirm('确定删除此项目？')) return
    try {
      await window.api.project.delete(id)
      await loadProjects()
    } catch (error) {
      handleError(error, 'deleteProject')
    }
  }

  return (
    <div className="w-full h-full bg-bg-primary flex items-center justify-center">
      <div className="w-[640px] px-4">
        <h1 className="text-3xl font-bold text-white mb-2">LocalCanvas</h1>
        <p className="text-text-primary/80 mb-8">本地 AI 视频创作画布</p>

        <div className="flex gap-2 mb-8">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="输入项目名称..."
            className="flex-1 bg-bg-secondary text-white px-4 py-2 rounded-lg outline-none border border-border focus:border-accent"
            onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating || !newName.trim()}
            className="bg-accent text-white px-6 py-2 rounded-lg hover:bg-accent-hover transition disabled:opacity-50"
          >
            {creating ? '创建中...' : '新建项目'}
          </button>
        </div>

        <h2 className="text-sm text-text-primary/90 mb-3">最近项目</h2>

        {loading ? (
          <div className="text-center text-text-muted py-8">加载中...</div>
        ) : projects.length === 0 ? (
          <div className="text-center text-text-muted py-8">还没有项目，创建一个开始吧</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={(id) => onOpenProject(id, p.name)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

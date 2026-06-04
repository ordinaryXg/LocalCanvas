import type { ProjectSummary } from '../../types/project'

interface ProjectCardProps {
  project: ProjectSummary
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}

export function ProjectCard({ project, onOpen, onDelete }: ProjectCardProps) {
  return (
    <div
      className="bg-bg-secondary p-4 rounded-lg border border-border hover:border-accent cursor-pointer transition group relative"
      onClick={() => onOpen(project.id)}
    >
      <div className="text-white text-sm font-medium">{project.name}</div>
      <div className="text-text-muted text-xs mt-1">
        {new Date(project.updatedAt).toLocaleString('zh-CN')}
      </div>
      <button
        type="button"
        className="absolute top-2 right-2 text-text-muted hover:text-danger text-xs opacity-0 group-hover:opacity-100 transition"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(project.id)
        }}
      >
        删除
      </button>
    </div>
  )
}

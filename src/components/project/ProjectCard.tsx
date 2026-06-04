import { useState, useCallback, useEffect } from 'react'
import type { ProjectSummary } from '../../types/project'

interface ProjectCardProps {
  project: ProjectSummary
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onRename?: (id: string, name: string) => void
  onOpenDir?: (id: string) => void
}

export function ProjectCard({
  project,
  onOpen,
  onDelete,
  onRename,
  onOpenDir,
}: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(project.name)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)

  useEffect(() => {
    let revoked: string | null = null
    void (async () => {
      if (!project.hasThumbnail) {
        setThumbnailUrl(null)
        return
      }
      try {
        const buffer = await window.api.project.readThumbnail(project.id)
        if (!buffer) {
          setThumbnailUrl(null)
          return
        }
        const url = URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' }))
        revoked = url
        setThumbnailUrl(url)
      } catch {
        setThumbnailUrl(null)
      }
    })()

    return () => {
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [project.id, project.hasThumbnail])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(true)
  }, [])

  const submitRename = () => {
    if (name.trim() && name !== project.name) {
      onRename?.(project.id, name.trim())
    }
    setRenaming(false)
    setMenuOpen(false)
  }

  return (
    <div
      className="bg-bg-secondary p-4 rounded-lg border border-border hover:border-accent cursor-pointer transition group relative"
      onClick={() => !renaming && onOpen(project.id)}
      onContextMenu={handleContextMenu}
    >
      <div className="w-full h-20 bg-bg-tertiary rounded mb-2 overflow-hidden flex items-center justify-center text-2xl text-text-muted">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={project.name} className="w-full h-full object-cover" />
        ) : (
          '🎬'
        )}
      </div>

      {renaming ? (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={submitRename}
          onKeyDown={(e) => e.key === 'Enter' && submitRename()}
          className="w-full bg-bg-primary text-white text-sm px-2 py-1 rounded border border-accent outline-none"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="text-white text-sm font-medium">{project.name}</div>
      )}

      <div className="text-text-muted text-[10px] mt-1 space-y-0.5">
        <div>创建: {new Date(project.createdAt || project.updatedAt).toLocaleDateString('zh-CN')}</div>
        <div>更新: {new Date(project.updatedAt).toLocaleString('zh-CN')}</div>
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

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-8 right-2 z-50 bg-bg-secondary border border-border rounded shadow-lg py-1 min-w-[100px]">
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary"
              onClick={(e) => {
                e.stopPropagation()
                setRenaming(true)
                setMenuOpen(false)
              }}
            >
              重命名
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary"
              onClick={(e) => {
                e.stopPropagation()
                onOpenDir?.(project.id)
                setMenuOpen(false)
              }}
            >
              打开目录
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 text-xs text-danger hover:bg-bg-tertiary"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(project.id)
                setMenuOpen(false)
              }}
            >
              删除
            </button>
          </div>
        </>
      )}
    </div>
  )
}

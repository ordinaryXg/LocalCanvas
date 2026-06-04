import { useProjectStore } from '../../stores/projectStore'

export function CanvasToolbar() {
  const { projectName, isSaving, lastSavedAt, isDirty } = useProjectStore()

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-bg-secondary/90 backdrop-blur px-4 py-1.5 rounded-full border border-border text-xs text-text-primary z-10">
      <span className="text-white font-medium">{projectName || '未命名项目'}</span>
      <span className="text-text-muted">|</span>
      {isSaving ? (
        <span className="text-accent">保存中...</span>
      ) : isDirty ? (
        <span className="text-amber-400">未保存</span>
      ) : lastSavedAt ? (
        <span>已保存 {new Date(lastSavedAt).toLocaleTimeString('zh-CN')}</span>
      ) : (
        <span>就绪</span>
      )}
    </div>
  )
}

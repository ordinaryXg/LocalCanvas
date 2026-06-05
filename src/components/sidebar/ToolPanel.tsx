import { useState, useEffect, useCallback } from 'react'
import type { WorkflowSummary } from '../../types/ipc'
import { useCanvasStore } from '../../stores/canvasStore'
import { remapWorkflowToCanvas } from '../../utils/loadWorkflow'
import { handleError } from '../../utils/ErrorHandler'
import { useT } from '../../i18n'

export function ToolPanel() {
  const t = useT()
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([])
  const [loading, setLoading] = useState(false)
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const setNodes = useCanvasStore((s) => s.setNodes)
  const setEdges = useCanvasStore((s) => s.setEdges)
  const markDirty = useCanvasStore((s) => s.markDirty)

  const loadWorkflows = useCallback(async () => {
    const list = await window.api.workflow.list()
    setWorkflows(list)
  }, [])

  useEffect(() => {
    void loadWorkflows()
  }, [loadWorkflows])

  const handleLoad = async (workflowId: string) => {
    setLoading(true)
    try {
      const workflow = await window.api.workflow.load(workflowId)
      const offset = { x: 50 + nodes.length * 20, y: 50 + nodes.length * 10 }
      const mapped = remapWorkflowToCanvas(
        workflow.nodes as Parameters<typeof remapWorkflowToCanvas>[0],
        workflow.edges as Parameters<typeof remapWorkflowToCanvas>[1],
        offset,
      )
      setNodes([...nodes, ...mapped.nodes])
      setEdges([...edges, ...mapped.edges])
      markDirty()
    } catch (error) {
      handleError(error, 'loadWorkflow')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    try {
      const result = await window.api.workflow.import()
      if (result.success && result.id) {
        await loadWorkflows()
        await handleLoad(result.id)
      }
    } catch (error) {
      handleError(error, 'importWorkflow')
    }
  }

  const handleExport = async (workflowId: string) => {
    try {
      await window.api.workflow.export(workflowId)
    } catch (error) {
      handleError(error, 'exportWorkflow')
    }
  }

  const handleDelete = async (workflowId: string) => {
    try {
      await window.api.workflow.delete(workflowId)
      await loadWorkflows()
    } catch (error) {
      handleError(error, 'deleteWorkflow')
    }
  }

  const presets = workflows.filter((w) => w.isPreset)
  const custom = workflows.filter((w) => !w.isPreset)

  return (
    <div className="p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-text-primary font-medium">{t('workflow.templates')}</span>
        <button
          type="button"
          onClick={() => void handleImport()}
          className="text-[10px] text-accent hover:underline"
        >
          {t('workflow.import')}
        </button>
      </div>

      {loading && <p className="text-[10px] text-text-muted mb-2">{t('workflow.loading')}</p>}

      {presets.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-text-muted mb-1">{t('workflow.presets')}</p>
          <div className="space-y-1">
            {presets.map((w) => (
              <WorkflowItem
                key={w.id}
                workflow={w}
                loadLabel={t('workflow.load')}
                exportLabel={t('workflow.export')}
                onLoad={() => void handleLoad(w.id)}
                onExport={() => void handleExport(w.id)}
              />
            ))}
          </div>
        </div>
      )}

      {custom.length > 0 && (
        <div>
          <p className="text-[10px] text-text-muted mb-1">{t('workflow.custom')}</p>
          <div className="space-y-1">
            {custom.map((w) => (
              <WorkflowItem
                key={w.id}
                workflow={w}
                loadLabel={t('workflow.load')}
                exportLabel={t('workflow.export')}
                deleteLabel={t('workflow.delete')}
                showDelete
                onLoad={() => void handleLoad(w.id)}
                onExport={() => void handleExport(w.id)}
                onDelete={() => void handleDelete(w.id)}
              />
            ))}
          </div>
        </div>
      )}

      {workflows.length === 0 && (
        <p className="text-[10px] text-text-muted py-2">{t('workflow.empty')}</p>
      )}
    </div>
  )
}

function WorkflowItem({
  workflow,
  loadLabel,
  exportLabel,
  deleteLabel,
  showDelete,
  onLoad,
  onExport,
  onDelete,
}: {
  workflow: WorkflowSummary
  loadLabel: string
  exportLabel: string
  deleteLabel?: string
  showDelete?: boolean
  onLoad: () => void
  onExport: () => void
  onDelete?: () => void
}) {
  return (
    <div className="bg-bg-tertiary rounded p-2 border border-transparent hover:border-accent transition">
      <div className="text-[11px] text-text-primary truncate">{workflow.name}</div>
      {workflow.description && (
        <div className="text-[9px] text-text-muted mt-0.5 line-clamp-2">{workflow.description}</div>
      )}
      <div className="flex gap-2 mt-1">
        <button type="button" onClick={onLoad} className="text-[9px] text-accent hover:underline">
          {loadLabel}
        </button>
        <button type="button" onClick={onExport} className="text-[9px] text-text-muted hover:underline">
          {exportLabel}
        </button>
        {showDelete && onDelete && deleteLabel && (
          <button
            type="button"
            onClick={onDelete}
            className="text-[9px] text-text-muted hover:text-danger"
          >
            {deleteLabel}
          </button>
        )}
      </div>
    </div>
  )
}

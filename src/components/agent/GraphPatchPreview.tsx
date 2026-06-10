import type { GraphPatch } from '../../types/agent'
import { isValidGraphPatch } from '../../utils/parseGraphPatch'
import { summarizePlanWarnings } from '../../utils/agentPlanWarnings'
import { useEditorShellStore } from '../../stores/editorShellStore'
import { useT } from '../../i18n'

interface GraphPatchPreviewProps {
  patch: GraphPatch
  warnings?: string[]
  onConfirm: () => void
  onDismiss: () => void
}

export function GraphPatchPreview({
  patch,
  warnings = [],
  onConfirm,
  onDismiss,
}: GraphPatchPreviewProps) {
  const t = useT()
  const openSettings = useEditorShellStore((s) => s.openSettings)
  const { blocking } = summarizePlanWarnings(warnings)

  if (!isValidGraphPatch(patch)) return null

  const addNodes = patch.addNodes ?? []
  const removeNodes = patch.removeNodeIds ?? []
  const removeEdges = patch.removeEdgeIds ?? []

  return (
    <div className="mt-3 p-3 rounded-lg border border-accent/40 bg-bg-tertiary/80">
      <div className="text-xs font-medium text-accent mb-1">{t('agent.patchTitle')}</div>
      <p className="text-[11px] text-text-primary mb-2">{patch.summary}</p>
      {patch.anchorNodeIds.length > 0 && (
        <p className="text-[10px] text-text-muted mb-2">
          {t('agent.patchAnchor')}: {patch.anchorNodeIds.join(', ')}
        </p>
      )}
      {warnings.length > 0 && (
        <ul className="text-[10px] text-warning space-y-0.5 mb-2 list-disc list-inside">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      <ul className="text-[10px] text-text-muted space-y-0.5 mb-3">
        {addNodes.map((n) => (
          <li key={n.tempId}>
            + {n.label || n.type} ({n.tempId})
          </li>
        ))}
        {removeNodes.map((id) => (
          <li key={`rm-${id}`}>- {t('agent.patchRemoveNode')} {id}</li>
        ))}
        {removeEdges.map((id) => (
          <li key={`re-${id}`}>- {t('agent.patchRemoveEdge')} {id}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        {blocking ? (
          <button
            type="button"
            onClick={() => openSettings({ tab: 'agent', focus: 'readiness' })}
            className="flex-1 py-1.5 text-xs rounded bg-accent text-white hover:bg-accent-hover"
          >
            {t('agent.goToSettings')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-1.5 text-xs rounded bg-accent text-white hover:bg-accent-hover"
          >
            {t('agent.applyPatch')}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="px-3 py-1.5 text-xs rounded border border-border text-text-muted hover:text-text-primary"
        >
          {t('app.cancel')}
        </button>
      </div>
    </div>
  )
}

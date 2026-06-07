import { useProjectStore } from '../../stores/projectStore'
import { NodeImageThumb } from '../common/NodeImageThumb'

interface Props {
  nodeId: string
  hasAsset: boolean
  kind?: 'image' | 'video' | 'audio'
}

export function InspectorStatusThumb({ nodeId, hasAsset, kind = 'image' }: Props) {
  const projectId = useProjectStore((s) => s.currentProjectId)

  if (!hasAsset) {
    const icon = kind === 'video' ? '🎥' : kind === 'audio' ? '🎵' : '🖼️'
    return (
      <div className="w-12 h-12 rounded border border-dashed border-border/60 bg-bg-tertiary/40 flex items-center justify-center text-lg opacity-50">
        {icon}
      </div>
    )
  }

  if (kind === 'image') {
    return (
      <div className="w-12 h-12 rounded border border-border overflow-hidden bg-bg-tertiary shrink-0">
        <NodeImageThumb projectId={projectId} nodeId={nodeId} alt="" className="w-full h-full object-cover" />
      </div>
    )
  }

  return (
    <div className="w-12 h-12 rounded border border-border bg-bg-tertiary/60 flex items-center justify-center text-lg">
      {kind === 'video' ? '🎥' : '🎵'}
    </div>
  )
}

import type { Edge } from '@xyflow/react'
import { NodeImageThumb } from '../common/NodeImageThumb'
import { visionImageIndexFromHandle } from '../../utils/llmVisionSlots'
import type { LlmGeneratorUiConfig } from '../../capabilities/generator-ui'

interface TextEditorVisionStripProps {
  visionEdges: Edge[]
  currentProjectId: string | null
  llmUi: LlmGeneratorUiConfig | null
}

export function TextEditorVisionStrip({
  visionEdges,
  currentProjectId,
  llmUi,
}: TextEditorVisionStripProps) {
  if (visionEdges.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] text-text-muted">
        Vision 图片 {visionEdges.length}
        {llmUi?.supportsVisionImage ? `/${llmUi.maxVisionImages}` : ''}
      </span>
      {visionEdges.map((edge) => (
        <div
          key={edge.id}
          className="w-10 h-10 rounded overflow-hidden border border-border"
          title={`图 ${visionImageIndexFromHandle(edge.targetHandle!) + 1}`}
        >
          <NodeImageThumb projectId={currentProjectId} nodeId={edge.source} alt="Vision" />
        </div>
      ))}
      {llmUi && !llmUi.supportsVisionImage && (
        <span className="text-[10px] text-amber-300">当前模型不支持图片输入</span>
      )}
    </div>
  )
}

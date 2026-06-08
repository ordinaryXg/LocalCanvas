import type { Node } from '@xyflow/react'
import { useCanvasStore } from '../../stores/canvasStore'
import { useEditorShellStore } from '../../stores/editorShellStore'
import { GENERATABLE_NODE_TYPES } from '../../constants/editorFeatures'
import { EDITOR_ACTION_LABELS, TYPE_LABELS } from './constants'
import { InspectorHeader } from './InspectorHeader'
import { InspectorActions } from './InspectorActions'
import { useOpenGeneratorDrawer } from './useOpenGeneratorDrawer'
import { ImageInspectorDetails } from './details/ImageInspectorDetails'
import { VideoInspectorDetails } from './details/VideoInspectorDetails'
import { TextInspectorDetails } from './details/TextInspectorDetails'
import { ScriptInspectorDetails } from './details/ScriptInspectorDetails'
import { AudioInspectorDetails } from './details/AudioInspectorDetails'
import { StoryboardInspectorDetails } from './details/StoryboardInspectorDetails'
import { ComposeInspectorDetails } from './details/ComposeInspectorDetails'

interface Props {
  node: Node
}

export function NodeInspector({ node }: Props) {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const openWorkbenchForCompose = useEditorShellStore((s) => s.openWorkbenchForCompose)
  const { openDrawer } = useOpenGeneratorDrawer(node.id)

  const type = node.type ?? 'text'
  const data = node.data as Record<string, unknown>
  const fallback = TYPE_LABELS[type] || type

  const openCompose = () => {
    openWorkbenchForCompose(node.id)
  }

  const showEditorAction =
    GENERATABLE_NODE_TYPES.has(type) && type !== 'compose'

  return (
    <div className="space-y-4">
      <InspectorHeader
        nodeId={node.id}
        type={type}
        title={data.title as string | undefined}
        fallback={fallback}
      />

      {type === 'image' && <ImageInspectorDetails node={node} nodes={nodes} edges={edges} />}
      {type === 'video' && <VideoInspectorDetails node={node} nodes={nodes} edges={edges} />}
      {type === 'text' && <TextInspectorDetails node={node} nodes={nodes} edges={edges} />}
      {type === 'script' && <ScriptInspectorDetails node={node} />}
      {type === 'audio' && <AudioInspectorDetails node={node} nodes={nodes} edges={edges} />}
      {type === 'storyboard' && <StoryboardInspectorDetails node={node} />}
      {type === 'compose' && <ComposeInspectorDetails node={node} />}

      {showEditorAction && (
        <InspectorActions label={EDITOR_ACTION_LABELS[type] ?? '打开编辑器'} onClick={openDrawer} />
      )}

      {type === 'compose' && (
        <InspectorActions label="打开剪辑台" onClick={openCompose} variant="edit" />
      )}
    </div>
  )
}

import { ImageEditorPanel } from './ImageEditorPanel'
import { VideoEditorPanel } from './VideoEditorPanel'
import { TextEditorPanel } from '../text/TextEditorPanel'
import { ScriptGenerator } from './ScriptGenerator'
import { AudioGenerator } from './AudioGenerator'
import { StoryboardGenerator } from './StoryboardGenerator'

interface Props {
  nodeId: string
  nodeType: string
  /** 工作台内嵌模式（无独立预览列时使用紧凑布局） */
  embedded?: boolean
  /** 工作台左侧已有独立预览区时隐藏面板内预览列 */
  hidePreview?: boolean
}

export function GeneratorContent({ nodeId, nodeType, embedded = false, hidePreview = false }: Props) {
  return (
    <>
      {nodeType === 'text' && <TextEditorPanel nodeId={nodeId} />}
      {nodeType === 'image' && <ImageEditorPanel nodeId={nodeId} hidePreview={hidePreview} />}
      {nodeType === 'video' && <VideoEditorPanel nodeId={nodeId} hidePreview={hidePreview} />}
      {nodeType === 'audio' && <AudioGenerator nodeId={nodeId} />}
      {nodeType === 'script' && <ScriptGenerator nodeId={nodeId} />}
      {nodeType === 'storyboard' && (
        <div className="h-full min-h-0">
          <StoryboardGenerator nodeId={nodeId} />
        </div>
      )}
    </>
  )
}

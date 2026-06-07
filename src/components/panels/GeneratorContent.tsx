import { ImageEditorPanel } from './ImageEditorPanel'
import { VideoGenerator } from './VideoGenerator'
import { TextEditorPanel } from '../text/TextEditorPanel'
import { ScriptGenerator } from './ScriptGenerator'
import { AudioGenerator } from './AudioGenerator'
import { StoryboardGenerator } from './StoryboardGenerator'

interface Props {
  nodeId: string
  nodeType: string
  /** GenerateMode / 旧版 GeneratorPanel 内嵌模式 */
  embedded?: boolean
}

export function GeneratorContent({ nodeId, nodeType, embedded = false }: Props) {
  return (
    <>
      {nodeType === 'text' && <TextEditorPanel nodeId={nodeId} />}
      {nodeType === 'image' && <ImageEditorPanel nodeId={nodeId} embedded={embedded} />}
      {nodeType === 'video' && <VideoGenerator nodeId={nodeId} />}
      {nodeType === 'audio' && <AudioGenerator nodeId={nodeId} />}
      {nodeType === 'script' && <ScriptGenerator nodeId={nodeId} />}
      {nodeType === 'storyboard' && <StoryboardGenerator nodeId={nodeId} />}
    </>
  )
}

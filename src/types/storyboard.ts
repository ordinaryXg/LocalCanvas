export type StoryboardLayout = 'list' | 'grid3' | 'grid5'

export type StoryboardFrameStatus = 'empty' | 'image' | 'video' | 'failed'

export interface StoryboardFrame {
  id: string
  sequence: number
  description: string
  prompt: string
  duration: number
  camera?: string
  imageNodeId?: string
  videoNodeId?: string
  imagePath?: string
  videoPath?: string
  imageSrc?: string
  videoSrc?: string
  status: StoryboardFrameStatus
}

export interface StoryboardNodeData {
  name?: string
  frames: StoryboardFrame[]
  layout: StoryboardLayout
  imageModelId?: string
  videoModelId?: string
  selectedFrameIds?: string[]
  [key: string]: unknown
}

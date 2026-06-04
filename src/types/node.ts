import type { Node, Edge } from '@xyflow/react'

export type NodeType = 'text' | 'image' | 'video' | 'audio' | 'script' | 'compose' | 'group'

export interface TextNodeData {
  /** 节点内直接编辑的输入内容 */
  inputContent?: string
  /** LLM 生成结果 */
  generatedContent?: string
  /** @deprecated 兼容旧项目，读取时回退到 generatedContent */
  content?: string
  prompt?: string
  systemPrompt?: string
  modelId?: string
  llmModel?: string
  [key: string]: unknown
}

export interface ImageNodeData {
  imageSrc?: string
  imageAssetPath?: string
  referenceSrc?: string
  referenceAssetPath?: string
  fileName?: string
  prompt?: string
  negativePrompt?: string
  modelId?: string
  ratio?: string
  isGenerating?: boolean
  progress?: number
  [key: string]: unknown
}

export interface VideoNodeData {
  videoSrc?: string
  videoAssetPath?: string
  fileName?: string
  prompt?: string
  modelId?: string
  duration?: number
  firstFrameSrc?: string
  firstFrameAssetPath?: string
  lastFrameSrc?: string
  lastFrameAssetPath?: string
  audioSrc?: string
  audioAssetPath?: string
  camera?: string
  isGenerating?: boolean
  progress?: number
  [key: string]: unknown
}

export interface AudioNodeData {
  audioSrc?: string
  audioAssetPath?: string
  fileName?: string
  [key: string]: unknown
}

export interface ScriptRow {
  id: string
  sequence: number
  description: string
  prompt: string
  duration: number
  camera: string
}

export interface ScriptNodeData {
  storyInput?: string
  scriptRows?: ScriptRow[]
  imageModelId?: string
  videoModelId?: string
  [key: string]: unknown
}

export interface ComposeClipItem {
  id: string
  name?: string
  assetPath?: string
  absolutePath?: string
  duration: number
  startTime?: number
}

export interface ComposeNodeData {
  clips?: ComposeClipItem[]
  audioAssetPath?: string
  audioSrc?: string
  outputPath?: string
  showTimeline?: boolean
  isComposing?: boolean
  composeProgress?: number
  [key: string]: unknown
}

export type PortType =
  | 'prompt'
  | 'reference'
  | 'firstFrame'
  | 'lastFrame'
  | 'audio'
  | 'video'
  | 'data'
  | 'script'

export type CanvasNode = Node
export type CanvasEdge = Edge

export interface NodeTypeMeta {
  type: NodeType
  label: string
  icon: string
  color: string
}

export const NODE_TYPE_META: NodeTypeMeta[] = [
  { type: 'text', label: '文本', icon: '📝', color: '#8b5cf6' },
  { type: 'image', label: '图片', icon: '🖼️', color: '#06b6d4' },
  { type: 'video', label: '视频', icon: '🎥', color: '#f43f5e' },
  { type: 'audio', label: '音频', icon: '🎵', color: '#22c55e' },
  { type: 'script', label: '脚本', icon: '🎬', color: '#f59e0b' },
  { type: 'compose', label: '合成', icon: '🎞️', color: '#6366f1' },
]

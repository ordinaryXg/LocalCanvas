import type { Node, Edge } from '@xyflow/react'
import type { ThinkingPreset } from './capability'

export type NodeType = 'text' | 'image' | 'video' | 'audio' | 'script' | 'compose' | 'storyboard' | 'group'

export type TextOutputMode = 'passthrough' | 'generated'

export interface TextEditorLayout {
  splitRatio?: number
}

export interface TextNodeData {
  /** 节点显示名 */
  title?: string
  /** 草稿：用户输入 / LLM 输入源 */
  draft?: string
  /** 输出：唯一连线下游的内容 */
  output?: string
  /** 输出模式（显式） */
  outputMode?: TextOutputMode
  /** generated 模式下 output 是否被手改 */
  outputEdited?: boolean
  systemPrompt?: string
  modelId?: string
  /** LLM 思考档位：快速 / 标准 / 深度 */
  thinkingPreset?: ThinkingPreset
  isGenerating?: boolean
  editorLayout?: TextEditorLayout
  /** 模型 reasoning 输出（展示用，不连线下游） */
  reasoningContent?: string
  /** @deprecated 加载时迁移到 draft */
  inputContent?: string
  /** @deprecated 加载时迁移到 output */
  generatedContent?: string
  /** @deprecated 加载时迁移到 output */
  content?: string
  /** @deprecated 不再写入 */
  prompt?: string
  /** @deprecated 合并到 modelId */
  llmModel?: string
  [key: string]: unknown
}

export interface ImageNodeData {
  /** 节点显示名 */
  title?: string
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
  title?: string
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
  title?: string
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
  sourceNodeId?: string
  name?: string
  assetPath?: string
  absolutePath?: string
  /** 相对源文件的入点（秒） */
  trimIn?: number
  /** 使用时长（秒） */
  duration: number
  /** 源文件总时长，用于裁切上限 */
  sourceDuration?: number
  /** 顺序模式：由引擎计算 */
  startTime?: number
  /** 从成片排除但保持连线 */
  excluded?: boolean
  thumbnailPath?: string
}

export interface ComposeEditorLayout {
  previewHeight?: number
  inspectorOpen?: boolean
  pixelsPerSecond?: number
}

export interface ComposeNodeData {
  clips?: ComposeClipItem[]
  audioAssetPath?: string
  audioSrc?: string
  audioVolume?: number
  audioFadeIn?: number
  audioFadeOut?: number
  subtitleCues?: Array<{ id: string; startTime: number; endTime: number; text: string }>
  subtitlePath?: string
  subtitleFileName?: string
  burnSubtitles?: boolean
  outputPath?: string
  editorLayout?: ComposeEditorLayout
  [key: string]: unknown
}

export type PortType =
  | 'prompt'
  | 'image'
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
  { type: 'text', label: '文本', icon: '📝', color: '#9a8fa6' },
  { type: 'image', label: '图片', icon: '🖼️', color: '#6e9598' },
  { type: 'video', label: '视频', icon: '🎥', color: '#b89090' },
  { type: 'audio', label: '音频', icon: '🎵', color: '#8fa88f' },
  { type: 'script', label: '脚本', icon: '🎬', color: '#b8a67a' },
  { type: 'compose', label: '合成', icon: '🎞️', color: '#8a90a8' },
  { type: 'storyboard', label: '分镜组', icon: '🎞️', color: '#a08fa8' },
]

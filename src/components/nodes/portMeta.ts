export interface PortMeta {
  icon: string
  /** 作为输入（左侧）时的说明 */
  inputHint: string
  /** 作为输出（右侧）时的说明 */
  outputHint: string
}

export const PORT_META: Record<string, PortMeta> = {
  prompt: {
    icon: '📝',
    inputHint: '接入：文本 / 脚本',
    outputHint: '输出至：图片 / 视频',
  },
  reference: {
    icon: '🖼️',
    inputHint: '接入：图片参考',
    outputHint: '输出至：图片 / 视频',
  },
  firstFrame: {
    icon: '首',
    inputHint: '接入：图片（首帧）',
    outputHint: '输出至：视频首帧',
  },
  lastFrame: {
    icon: '尾',
    inputHint: '接入：图片（尾帧）',
    outputHint: '输出至：视频尾帧',
  },
  audio: {
    icon: '🎵',
    inputHint: '接入：音频',
    outputHint: '输出至：视频',
  },
  video: {
    icon: '🎥',
    inputHint: '接入：视频',
    outputHint: '输出至：下游',
  },
  script: {
    icon: '🎬',
    inputHint: '接入：脚本',
    outputHint: '输出至：图片 / 视频',
  },
}

export function getPortHint(portId: string, handleType: 'source' | 'target'): string {
  const meta = PORT_META[portId]
  if (!meta) return portId
  return handleType === 'target' ? meta.inputHint : meta.outputHint
}

export function getPortIcon(portId: string): string {
  return PORT_META[portId]?.icon ?? '●'
}

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
  image: {
    icon: '🖼️',
    inputHint: '接入：图片',
    outputHint: '输出至：图片参考 / 视频首尾帧',
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
    inputHint: '接入：视频 / 合成成片',
    outputHint: '输出至：合成 / 视频',
  },
  script: {
    icon: '🎬',
    inputHint: '接入：脚本',
    outputHint: '输出至：图片 / 视频',
  },
  composed: {
    icon: '▶',
    inputHint: '成片输出',
    outputHint: '输出至：视频节点',
  },
  video1: {
    icon: '1',
    inputHint: '接入：视频片段1',
    outputHint: '视频输入1',
  },
  video2: {
    icon: '2',
    inputHint: '接入：视频片段2',
    outputHint: '视频输入2',
  },
  video3: {
    icon: '3',
    inputHint: '接入：视频片段3',
    outputHint: '视频输入3',
  },
  video4: { icon: '4', inputHint: '接入：视频片段4', outputHint: '视频输入4' },
  video5: { icon: '5', inputHint: '接入：视频片段5', outputHint: '视频输入5' },
  video6: { icon: '6', inputHint: '接入：视频片段6', outputHint: '视频输入6' },
}

export function getPortHint(portId: string, handleType: 'source' | 'target'): string {
  const meta = PORT_META[portId]
  if (meta) return handleType === 'target' ? meta.inputHint : meta.outputHint
  const videoMatch = portId.match(/^video(\d+)$/)
  if (videoMatch) {
    const n = videoMatch[1]
    return handleType === 'target' ? `接入：视频片段${n}` : `视频输入${n}`
  }
  const refMatch = portId.match(/^reference(\d+)$/)
  if (refMatch) {
    const n = refMatch[1]
    return handleType === 'target' ? `接入：参考图 ${n}` : `参考图 ${n}`
  }
  const visionMatch = portId.match(/^image(\d+)$/)
  if (visionMatch) {
    const n = visionMatch[1]
    return handleType === 'target' ? `接入：Vision 图 ${n}` : `Vision 图 ${n}`
  }
  return portId
}

export function getPortIcon(portId: string): string {
  if (PORT_META[portId]) return PORT_META[portId].icon
  const videoMatch = portId.match(/^video(\d+)$/)
  if (videoMatch) return videoMatch[1]
  const refMatch = portId.match(/^reference(\d+)$/)
  if (refMatch) return refMatch[1]
  const visionMatch = portId.match(/^image(\d+)$/)
  if (visionMatch) return visionMatch[1]
  return '●'
}

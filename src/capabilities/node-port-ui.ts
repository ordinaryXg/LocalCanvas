import { DEFAULT_SEEDANCE_VIDEO_MODEL } from '../constants/seedance'
import { DEFAULT_SEEDREAM_IMAGE_MODEL } from '../constants/seedream'
import { listLlmVisionImageHandles } from '../utils/llmVisionSlots'
import { listVideoReferenceHandles } from '../utils/videoReferenceSlots'
import { getImageGeneratorUi, getLlmGeneratorUi, getVideoGeneratorUi } from './generator-ui'

export interface NodePortDef {
  id: string
  top?: string
  /** 槽位已满等场景可灰显（仍保留已连接边） */
  disabled?: boolean
  /** 入边槽位计数，如 `2/9` */
  slotLabel?: string
}

/** 将 N 个入边端口均匀分布在节点左侧 */
export function distributePortTops(count: number, start = 16, end = 90): string[] {
  if (count <= 0) return []
  if (count === 1) return ['50%']
  return Array.from(
    { length: count },
    (_, i) => `${start + (i / (count - 1)) * (end - start)}%`,
  )
}

export function getVideoNodePorts(
  configId?: string,
  apiModel?: string,
  slotDisabled?: Partial<Record<string, boolean>>,
): NodePortDef[] {
  const ui = getVideoGeneratorUi(
    configId || DEFAULT_SEEDANCE_VIDEO_MODEL.id,
    apiModel,
  )
  const portIds: string[] = ['prompt']
  if (ui.supportsReferenceVideo) portIds.push('video')
  if (ui.supportsFirstFrame) portIds.push('firstFrame')
  if (ui.supportsLastFrame) portIds.push('lastFrame')
  if (ui.supportsReferenceImage && ui.maxReferenceImages > 0) {
    portIds.push(...listVideoReferenceHandles(ui.maxReferenceImages))
  }
  if (ui.supportsReferenceAudio) portIds.push('audio')

  const tops = distributePortTops(portIds.length)
  return portIds.map((id, i) => ({
    id,
    top: tops[i],
    disabled: slotDisabled?.[id],
  }))
}

export function getTextNodePorts(
  configId?: string,
  apiModel?: string,
  slotDisabled?: Partial<Record<string, boolean>>,
): NodePortDef[] {
  if (!configId) {
    return [{ id: 'image1', top: '38%' }]
  }
  const ui = getLlmGeneratorUi(configId, apiModel)
  if (!ui.supportsVisionImage) return []
  const portIds = listLlmVisionImageHandles(ui.maxVisionImages)
  const tops = distributePortTops(portIds.length, 20, 88)
  return portIds.map((id, i) => ({
    id,
    top: tops[i],
    disabled: slotDisabled?.[id],
  }))
}

export function getImageNodePorts(
  configId?: string,
  apiModel?: string,
  slotDisabled?: Partial<Record<string, boolean>>,
): NodePortDef[] {
  const ui = getImageGeneratorUi(configId || DEFAULT_SEEDREAM_IMAGE_MODEL.id, apiModel)
  const ports: NodePortDef[] = [{ id: 'prompt', top: '35%' }]
  if (ui.supportsReferenceImage) {
    ports.push({
      id: 'reference',
      top: '65%',
      disabled: slotDisabled?.reference,
    })
  }
  return ports
}

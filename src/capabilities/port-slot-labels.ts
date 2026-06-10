import type { Edge } from '@xyflow/react'
import { DEFAULT_SEEDANCE_VIDEO_MODEL } from '../constants/seedance'
import { DEFAULT_SEEDREAM_IMAGE_MODEL } from '../constants/seedream'
import { listLlmVisionImageHandles } from '../utils/llmVisionSlots'
import {
  isVideoReferenceImageHandle,
  listVideoReferenceHandles,
} from '../utils/videoReferenceSlots'
import { getImageGeneratorUi, getLlmGeneratorUi, getVideoGeneratorUi } from './generator-ui'
import type { NodePortDef } from './node-port-ui'

export function applyPortSlotLabels(
  ports: NodePortDef[],
  labels: Record<string, string>,
): NodePortDef[] {
  return ports.map((p) => ({
    ...p,
    slotLabel: labels[p.id],
  }))
}

function singleSlotLabel(edges: Edge[], nodeId: string, handle: string): string {
  const connected = edges.some((e) => e.target === nodeId && e.targetHandle === handle) ? 1 : 0
  return `${connected}/1`
}

export function getVideoPortSlotLabels(
  nodeId: string,
  edges: Edge[],
  configId?: string,
  apiModel?: string,
): Record<string, string> {
  const ui = getVideoGeneratorUi(configId || DEFAULT_SEEDANCE_VIDEO_MODEL.id, apiModel)
  const inbound = edges.filter((e) => e.target === nodeId && e.targetHandle)
  const labels: Record<string, string> = {}

  if (ui.maxReferenceImages > 0) {
    const refHandles = listVideoReferenceHandles(ui.maxReferenceImages)
    const refCount = inbound.filter(
      (e) => e.targetHandle && isVideoReferenceImageHandle(e.targetHandle),
    ).length
    if (refHandles[0]) labels[refHandles[0]] = `${refCount}/${ui.maxReferenceImages}`
  }

  if (ui.supportsFirstFrame) labels.firstFrame = singleSlotLabel(edges, nodeId, 'firstFrame')
  if (ui.supportsLastFrame) labels.lastFrame = singleSlotLabel(edges, nodeId, 'lastFrame')
  if (ui.supportsReferenceVideo) labels.video = singleSlotLabel(edges, nodeId, 'video')
  if (ui.supportsReferenceAudio) labels.audio = singleSlotLabel(edges, nodeId, 'audio')

  return labels
}

export function getImagePortSlotLabels(
  nodeId: string,
  edges: Edge[],
  configId?: string,
  apiModel?: string,
): Record<string, string> {
  const ui = getImageGeneratorUi(configId || DEFAULT_SEEDREAM_IMAGE_MODEL.id, apiModel)
  if (!ui.supportsReferenceImage) return {}
  if (ui.maxReferenceImages <= 1) {
    return { reference: singleSlotLabel(edges, nodeId, 'reference') }
  }
  const refHandles = listVideoReferenceHandles(ui.maxReferenceImages)
  const refCount = edges.filter(
    (e) =>
      e.target === nodeId &&
      e.targetHandle &&
      isVideoReferenceImageHandle(e.targetHandle),
  ).length
  const labels: Record<string, string> = {}
  if (refHandles[0]) labels[refHandles[0]] = `${refCount}/${ui.maxReferenceImages}`
  return labels
}

export function getTextPortSlotLabels(
  nodeId: string,
  edges: Edge[],
  configId?: string,
  apiModel?: string,
): Record<string, string> {
  if (!configId) return {}
  const ui = getLlmGeneratorUi(configId, apiModel)
  if (!ui.supportsVisionImage || ui.maxVisionImages <= 0) return {}

  const handles = listLlmVisionImageHandles(ui.maxVisionImages)
  const connected = edges.filter(
    (e) =>
      e.target === nodeId &&
      e.targetHandle &&
      handles.includes(e.targetHandle),
  ).length
  const labels: Record<string, string> = {}
  if (handles[0]) labels[handles[0]] = `${connected}/${ui.maxVisionImages}`
  return labels
}

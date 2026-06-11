import type { StoryboardFrame, StoryboardTake } from '../types/storyboard'
import { generateId } from './id'

export function resolveFrameActiveMedia(frame: StoryboardFrame): {
  imageNodeId?: string
  videoNodeId?: string
  imagePath?: string
  videoPath?: string
  imageSrc?: string
  videoSrc?: string
} {
  if (frame.takes?.length) {
    const selected =
      frame.takes.find((t) => t.id === frame.selectedTakeId) ?? frame.takes[frame.takes.length - 1]
    return {
      imageNodeId: selected.imageNodeId ?? frame.imageNodeId,
      videoNodeId: selected.videoNodeId ?? frame.videoNodeId,
      imagePath: selected.imagePath ?? frame.imagePath,
      videoPath: selected.videoPath ?? frame.videoPath,
      imageSrc: selected.imageSrc ?? frame.imageSrc,
      videoSrc: selected.videoSrc ?? frame.videoSrc,
    }
  }
  return {
    imageNodeId: frame.imageNodeId,
    videoNodeId: frame.videoNodeId,
    imagePath: frame.imagePath,
    videoPath: frame.videoPath,
    imageSrc: frame.imageSrc,
    videoSrc: frame.videoSrc,
  }
}

export function selectStoryboardTake(frame: StoryboardFrame, takeId: string): StoryboardFrame {
  if (!frame.takes?.some((t) => t.id === takeId)) return frame
  const active = frame.takes.find((t) => t.id === takeId)!
  return {
    ...frame,
    selectedTakeId: takeId,
    imageNodeId: active.imageNodeId ?? frame.imageNodeId,
    videoNodeId: active.videoNodeId ?? frame.videoNodeId,
    imagePath: active.imagePath ?? frame.imagePath,
    videoPath: active.videoPath ?? frame.videoPath,
    imageSrc: active.imageSrc ?? frame.imageSrc,
    videoSrc: active.videoSrc ?? frame.videoSrc,
  }
}

export function appendStoryboardTake(
  frame: StoryboardFrame,
  partial: Omit<StoryboardTake, 'id'> & { id?: string },
): StoryboardFrame {
  const take: StoryboardTake = { id: partial.id ?? generateId('take'), ...partial }
  const takes = [...(frame.takes ?? []), take]
  return selectStoryboardTake({ ...frame, takes }, take.id)
}

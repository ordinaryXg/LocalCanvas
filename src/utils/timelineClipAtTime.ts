export interface TimelineClipLike {
  id: string
  startTime: number
  duration: number
}

export function findClipAtTime<T extends TimelineClipLike>(
  clips: T[],
  time: number,
): { clip: T; offsetInClip: number } | null {
  for (const clip of clips) {
    const end = clip.startTime + clip.duration
    if (time >= clip.startTime && time < end) {
      return { clip, offsetInClip: Math.max(0, time - clip.startTime) }
    }
  }
  return null
}

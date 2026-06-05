export type SeedanceContentRole =
  | 'first_frame'
  | 'last_frame'
  | 'reference_image'
  | 'reference_video'
  | 'reference_audio'

export interface SeedanceContentItem {
  type: 'text' | 'image_url' | 'video_url' | 'audio_url'
  text?: string
  image_url?: { url: string }
  video_url?: { url: string }
  audio_url?: { url: string }
  role?: SeedanceContentRole
}

export interface BuildSeedanceContentInput {
  promptText: string
  isV2: boolean
  firstFrame?: string
  lastFrame?: string
  referenceImages?: string[]
  referenceVideo?: string
  referenceAudio?: string
}

export function buildSeedanceContent(input: BuildSeedanceContentInput): SeedanceContentItem[] {
  const content: SeedanceContentItem[] = [{ type: 'text', text: input.promptText }]

  const pushImage = (url: string, role: SeedanceContentRole) => {
    content.push({
      type: 'image_url',
      image_url: { url },
      ...(input.isV2 ? { role } : {}),
    })
  }

  if (input.firstFrame) pushImage(input.firstFrame, 'first_frame')
  if (input.lastFrame) pushImage(input.lastFrame, 'last_frame')

  for (const url of input.referenceImages ?? []) {
    if (url) pushImage(url, 'reference_image')
  }

  if (input.referenceVideo) {
    content.push({
      type: 'video_url',
      video_url: { url: input.referenceVideo },
      ...(input.isV2 ? { role: 'reference_video' } : {}),
    })
  }

  if (input.referenceAudio) {
    content.push({
      type: 'audio_url',
      audio_url: { url: input.referenceAudio },
      ...(input.isV2 ? { role: 'reference_audio' } : {}),
    })
  }

  return content
}

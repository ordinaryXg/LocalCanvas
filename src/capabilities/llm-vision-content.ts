export interface VisionContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

/** OpenAI 兼容多模态 user content：先图后文 */
export function buildVisionUserContent(
  prompt: string,
  imageUrls?: string[],
): string | VisionContentPart[] {
  const urls = imageUrls?.filter(Boolean) ?? []
  if (urls.length === 0) return prompt
  return [
    ...urls.map((url) => ({
      type: 'image_url' as const,
      image_url: { url },
    })),
    { type: 'text' as const, text: prompt },
  ]
}

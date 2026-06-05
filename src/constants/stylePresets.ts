export interface StylePreset {
  id: string
  name: string
  nameEn: string
  promptPrefix: string
  negativePrompt: string
  recommendedImageModel?: string
  recommendedVideoModel?: string
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'cinematic',
    name: '电影感',
    nameEn: 'Cinematic',
    promptPrefix: 'cinematic film still, dramatic lighting, shallow depth of field, 35mm, ',
    negativePrompt: 'cartoon, anime, low quality, blurry, watermark',
  },
  {
    id: 'anime',
    name: '动漫',
    nameEn: 'Anime',
    promptPrefix: 'anime style, vibrant colors, clean line art, studio quality, ',
    negativePrompt: 'photorealistic, blurry, low quality, watermark',
  },
  {
    id: 'product-ad',
    name: '产品广告',
    nameEn: 'Product Ad',
    promptPrefix: 'commercial product photography, studio lighting, clean background, premium look, ',
    negativePrompt: 'cluttered, dark, low quality, distorted',
  },
  {
    id: 'documentary',
    name: '纪录片',
    nameEn: 'Documentary',
    promptPrefix: 'documentary footage, natural lighting, realistic, handheld camera feel, ',
    negativePrompt: 'fantasy, cartoon, oversaturated, watermark',
  },
  {
    id: 'cyberpunk',
    name: '赛博朋克',
    nameEn: 'Cyberpunk',
    promptPrefix: 'cyberpunk neon city, rain reflections, futuristic, high contrast, ',
    negativePrompt: 'daylight pastoral, low quality, blurry',
  },
]

export function getStylePreset(id: string): StylePreset | undefined {
  return STYLE_PRESETS.find((p) => p.id === id)
}

export function applyStyleToPrompt(basePrompt: string, preset: StylePreset): string {
  const trimmed = basePrompt.trim()
  if (!trimmed) return preset.promptPrefix.trim()
  if (trimmed.startsWith(preset.promptPrefix.trim())) return trimmed
  return `${preset.promptPrefix}${trimmed}`
}

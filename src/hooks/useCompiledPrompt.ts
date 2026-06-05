import { FLUID_RESONANCE } from '../constants/fluidFeatures'

export async function compileForProject(
  projectId: string | null,
  basePrompt: string,
): Promise<{ prompt: string; negative: string }> {
  if (!projectId || !FLUID_RESONANCE) {
    return { prompt: basePrompt, negative: '' }
  }
  try {
    const compiled = await window.api.resonance.compilePrompt(projectId)
    const prompt = [basePrompt, compiled.prompt].filter(Boolean).join(', ')
    return { prompt, negative: compiled.negativePrompt }
  } catch {
    return { prompt: basePrompt, negative: '' }
  }
}

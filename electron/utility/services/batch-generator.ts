import type { AdapterRegistry } from './model-adapter/factory'
import type { GenerateImageParams, GenerateVideoParams } from './model-adapter/base'

export interface BatchImageTask {
  sequence: number
  prompt: string
  width: number
  height: number
  negativePrompt?: string
}

export interface BatchVideoTask {
  sequence: number
  prompt: string
  duration: number
  width: number
  height: number
  camera?: string
  firstFrame?: string
  ratio?: string
  resolution?: string
  generateAudio?: boolean
}

export interface BatchItemResult {
  sequence: number
  result: string
}

type ProgressCallback = (completed: number, total: number, sequence: number) => void
type ItemCompleteCallback = (item: BatchItemResult) => void

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const i = nextIndex++
      results[i] = await fn(items[i], i)
    }
  }

  const workers = Math.min(Math.max(1, limit), items.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return results
}

export async function batchGenerateImages(
  adapters: AdapterRegistry,
  modelId: string,
  scriptNodeId: string,
  tasks: BatchImageTask[],
  maxConcurrent: number,
  onProgress?: ProgressCallback,
  onItemComplete?: ItemCompleteCallback,
): Promise<BatchItemResult[]> {
  const adapter = adapters.getImageAdapter(modelId)
  let completed = 0

  const results = await runWithConcurrency(tasks, maxConcurrent, async (task) => {
    const params: GenerateImageParams = {
      prompt: task.prompt,
      negativePrompt: task.negativePrompt,
      width: task.width,
      height: task.height,
      model: '',
      nodeId: `${scriptNodeId}-img-${task.sequence}`,
    }
    const result = await adapter.generateImage(params)
    const item = { sequence: task.sequence, result }
    completed += 1
    onProgress?.(completed, tasks.length, task.sequence)
    onItemComplete?.(item)
    return item
  })

  return results
}

export async function batchGenerateVideos(
  adapters: AdapterRegistry,
  modelId: string,
  scriptNodeId: string,
  tasks: BatchVideoTask[],
  maxConcurrent: number,
  onProgress?: ProgressCallback,
  onItemComplete?: ItemCompleteCallback,
): Promise<BatchItemResult[]> {
  const adapter = adapters.getVideoAdapter(modelId)
  let completed = 0

  const results = await runWithConcurrency(tasks, maxConcurrent, async (task) => {
    const params: GenerateVideoParams = {
      prompt: task.prompt,
      width: task.width,
      height: task.height,
      duration: task.duration,
      model: '',
      camera: task.camera,
      firstFrame: task.firstFrame,
      ratio: task.ratio ?? (task.firstFrame ? 'adaptive' : '16:9'),
      resolution: task.resolution ?? '720p',
      generateAudio: task.generateAudio ?? true,
      nodeId: `${scriptNodeId}-vid-${task.sequence}`,
    }
    const result = await adapter.generateVideo(params)
    const item = { sequence: task.sequence, result }
    completed += 1
    onProgress?.(completed, tasks.length, task.sequence)
    onItemComplete?.(item)
    return item
  })

  return results
}

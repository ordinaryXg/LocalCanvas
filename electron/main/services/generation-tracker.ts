import { readConfig } from './config'
import { getGenerationRepository } from '../repositories/generation-repository'
import { getUtilityClient } from './utility-client'
import { logger } from './logger'

type GenerationType = 'image' | 'video' | 'text' | 'audio'

interface PendingGeneration {
  id: string
  startedAt: number
  type: GenerationType
}

const pendingByTaskId = new Map<string, PendingGeneration>()
let activeProjectId: string | null = null

export function setActiveProjectId(projectId: string | null): void {
  activeProjectId = projectId
}

export function getActiveProjectId(): string | null {
  return activeProjectId
}

async function findModelInfo(
  type: GenerationType,
  modelId: string,
): Promise<{ name: string; provider: string }> {
  try {
    const config = await readConfig()
    const list =
      type === 'image'
        ? config.image_models
        : type === 'video'
          ? config.video_models
          : type === 'text'
            ? config.llm_models
            : config.tts_models
    const model = list.find((m) => m.id === modelId)
    return { name: model?.name || modelId, provider: model?.provider || 'unknown' }
  } catch {
    return { name: modelId, provider: 'unknown' }
  }
}

export function trackGenerationStart(
  taskId: string,
  type: GenerationType,
  modelId: string,
  nodeId: string,
  prompt: string,
  projectId?: string,
  negativePrompt?: string,
  params?: Record<string, unknown>,
): void {
  void (async () => {
    try {
      const { name, provider } = await findModelInfo(type, modelId)
      const repo = getGenerationRepository()
      const id = repo.create({
        type,
        modelId,
        modelName: name,
        provider,
        prompt,
        negativePrompt,
        params,
        status: 'running',
        progress: 0,
        projectId: projectId ?? activeProjectId ?? undefined,
        nodeId,
        startedAt: new Date().toISOString(),
      })
      pendingByTaskId.set(taskId, { id, startedAt: Date.now(), type })
    } catch (error) {
      logger.warn('trackGenerationStart failed', error)
    }
  })()
}

export function trackBatchItemComplete(payload: {
  type: 'image' | 'video'
  modelId: string
  nodeId: string
  prompt: string
  outputPath: string
  projectId?: string
}): void {
  void (async () => {
    try {
      const { name, provider } = await findModelInfo(payload.type, payload.modelId)
      const repo = getGenerationRepository()
      const id = repo.create({
        type: payload.type,
        modelId: payload.modelId,
        modelName: name,
        provider,
        prompt: payload.prompt,
        status: 'completed',
        progress: 100,
        outputPath: payload.outputPath,
        projectId: payload.projectId ?? activeProjectId ?? undefined,
        nodeId: payload.nodeId,
        completedAt: new Date().toISOString(),
      })
      if (payload.type === 'image' || payload.type === 'video') {
        void generateAndSaveThumbnail(id, payload.type, payload.outputPath)
      }
    } catch (error) {
      logger.warn('trackBatchItemComplete failed', error)
    }
  })()
}

async function generateAndSaveThumbnail(
  recordId: string,
  type: GenerationType,
  outputPath: string,
): Promise<void> {
  if (type !== 'image' && type !== 'video') return
  try {
    const thumbPath = await getUtilityClient().generateThumbnail(outputPath, 0)
    getGenerationRepository().update(recordId, { thumbnailPath: thumbPath })
  } catch (error) {
    logger.warn('generateAndSaveThumbnail failed', error)
  }
}

export function trackGenerationComplete(taskId: string, outputPath: string): void {
  const pending = pendingByTaskId.get(taskId)
  if (!pending) return

  try {
    const durationMs = Date.now() - pending.startedAt
    getGenerationRepository().update(pending.id, {
      status: 'completed',
      progress: 100,
      outputPath,
      completedAt: new Date().toISOString(),
      durationMs,
    })
    if (pending.type === 'image' || pending.type === 'video') {
      void generateAndSaveThumbnail(pending.id, pending.type, outputPath)
    }
  } catch (error) {
    logger.warn('trackGenerationComplete failed', error)
  } finally {
    pendingByTaskId.delete(taskId)
  }
}

export function trackGenerationError(taskId: string, error: string): void {
  const pending = pendingByTaskId.get(taskId)
  if (!pending) return

  try {
    getGenerationRepository().update(pending.id, {
      status: 'failed',
      error,
      completedAt: new Date().toISOString(),
    })
  } catch (err) {
    logger.warn('trackGenerationError failed', err)
  } finally {
    pendingByTaskId.delete(taskId)
  }
}

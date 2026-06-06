import { ipcMain, BrowserWindow } from 'electron'
import { v4 as uuid } from 'uuid'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import {
  appendFluidEvent,
  appendPalimpsestLayer,
  appendShotCandidate,
  archiveShotCandidate,
  collapseShotCandidate,
  compileResonancePrompt,
  createResonanceSource,
  deleteResonanceSource,
  endFluidSession,
  getAffectEnvelope,
  getFluidState,
  getProbeBudget,
  getRecentResonanceHash,
  getResonanceField,
  incrementProbeBudget,
  listFluidEvents,
  listPalimpsestLayers,
  listResonanceSources,
  listShotCandidates,
  patchFluidState,
  patchResonanceSource,
  recallPalimpsestLayers,
  recalcFluidTemperature,
  saveAffectEnvelope,
  saveGhostPreview,
  upsertShotBindings,
  countUnresolvedGhosts,
} from '../services/fluid-service'
import { readConfig } from '../services/config'
import { getUtilityClient } from '../services/utility-client'
import { getProjectAssetsPath } from '../services/project'
import { getDatabase } from '../database'
import { logger } from '../services/logger'
import { compileDownResonance, projectUp } from '../../utility/services/fluid/fluid-compiler'
import { detectCliffs } from '../../utility/services/fluid/affect-math'
import { applyResolution, normalizeChorusResolution } from '../../utility/services/fluid/chorus'
import type { ChorusResolution, ResonanceSummary } from '../../../src/types/fluid'
import { METAPHOR_INJECT_PREFIX } from '../../../src/types/fluid'
import type { Node, Edge } from '@xyflow/react'
import { parseLlmJson } from '../../utility/services/fluid/parse-llm-json'

async function defaultLlmId(): Promise<string> {
  const config = await readConfig()
  return config.settings.default_llm
}

async function llmJson<T>(prompt: string, system: string): Promise<T | null> {
  if (!prompt.trim()) return null
  try {
    const modelId = await defaultLlmId()
    if (!modelId) return null
    const raw = await getUtilityClient().generateText(modelId, 'fluid-llm', {
      prompt,
      systemPrompt: system,
    })
    const parsed = parseLlmJson<T>(raw)
    if (!parsed) {
      logger.warn('fluid llmJson: no valid JSON in response', raw.slice(0, 200))
    }
    return parsed
  } catch (e) {
    logger.warn('fluid llmJson failed', e)
    return null
  }
}

function summaryFromPhrase(text: string): ResonanceSummary {
  return {
    colorTemp: 5000,
    colorHex: '#6b7280',
    arousal: 0.5,
    valence: 0,
    metaphor: text.slice(0, 80),
    tags: text.split(/\s+/).slice(0, 5),
  }
}

function vectorFromSummary(s: ResonanceSummary): number[] {
  return [
    s.colorTemp / 10000,
    s.arousal,
    s.valence,
    (s.rhythmBpm ?? 90) / 200,
    s.motionLevel ?? 0.5,
    0.5,
    0.5,
    0.5,
  ]
}

export function registerFluidIpc(): void {
  ipcMain.handle('fluid:getState', (_e, projectId: string) => getFluidState(projectId))
  ipcMain.handle('fluid:patchState', (_e, projectId: string, patch: Record<string, unknown>) =>
    patchFluidState(projectId, patch as Parameters<typeof patchFluidState>[1]),
  )
  ipcMain.handle('fluid:listEvents', (_e, projectId: string, limit?: number) =>
    listFluidEvents(projectId, limit),
  )
  ipcMain.handle('fluid:endSession', (_e, projectId: string) => {
    endFluidSession(projectId)
    return { success: true }
  })
  ipcMain.handle('fluid:appendEvent', (_e, projectId: string, name: string, payload?: object) =>
    appendFluidEvent(projectId, name, payload),
  )

  ipcMain.handle('resonance:list', (_e, projectId: string) => listResonanceSources(projectId))
  ipcMain.handle('resonance:getField', (_e, projectId: string) => getResonanceField(projectId))
  ipcMain.handle('resonance:compilePrompt', (_e, projectId: string) =>
    compileResonancePrompt(projectId),
  )
  ipcMain.handle(
    'resonance:create',
    async (_e, projectId: string, type: string, payload: { text?: string; assetPath?: string }) => {
      let summary: ResonanceSummary
      if (type === 'phrase' && payload.text) {
        const extracted = await llmJson<{
          metaphor: string
          arousal: number
          valence: number
          colorTemp: number
          tags: string[]
        }>(
          payload.text,
          'Extract resonance JSON: metaphor, arousal 0-1, valence -1 to 1, colorTemp kelvin, tags array. JSON only.',
        )
        summary = extracted
          ? {
              colorTemp: extracted.colorTemp ?? 5000,
              colorHex: '#6b7280',
              arousal: extracted.arousal ?? 0.5,
              valence: extracted.valence ?? 0,
              metaphor: extracted.metaphor ?? payload.text,
              tags: extracted.tags ?? [],
            }
          : summaryFromPhrase(payload.text)
      } else {
        summary = {
          colorTemp: 4500,
          colorHex: '#4b5563',
          arousal: 0.4,
          valence: -0.1,
          metaphor: 'visual reference',
          tags: ['reference'],
        }
      }
      return createResonanceSource(
        projectId,
        type as 'phrase',
        payload,
        summary,
        vectorFromSummary(summary),
      )
    },
  )
  ipcMain.handle(
    'resonance:patch',
    (_e, id: string, patch: { gravity?: number }) => patchResonanceSource(id, patch),
  )
  ipcMain.handle('resonance:delete', (_e, id: string) => {
    deleteResonanceSource(id)
    return { success: true }
  })

  ipcMain.handle(
    'fluidCompiler:compileDown',
    (_e, projectId: string, nodes: Node[], edges: Edge[]) => {
      const field = getResonanceField(projectId)
      return compileDownResonance(field, nodes, edges)
    },
  )
  ipcMain.handle(
    'fluidCompiler:projectUp',
    (_e, projectId: string, nodes: Node[], compiledPrompt: string) =>
      projectUp(projectId, nodes, compiledPrompt),
  )
  ipcMain.handle(
    'fluidCompiler:syncBindings',
    (_e, projectId: string, nodes: Node[]) => {
      const { bindings } = projectUp(projectId, nodes, '')
      const now = new Date().toISOString()
      upsertShotBindings(
        projectId,
        bindings.map((b) => ({ ...b, projectId, createdAt: now })),
      )
      return bindings
    },
  )

  ipcMain.handle('affect:get', (_e, projectId: string) => getAffectEnvelope(projectId))
  ipcMain.handle('affect:save', (_e, envelope: Parameters<typeof saveAffectEnvelope>[0]) => {
    saveAffectEnvelope({ ...envelope, updatedAt: new Date().toISOString() })
    return getAffectEnvelope(envelope.projectId)
  })
  ipcMain.handle('affect:detectCliffs', (_e, projectId: string) => {
    const env = getAffectEnvelope(projectId)
    return detectCliffs(env.arousalSeries, env.sampleRate)
  })

  ipcMain.handle('superposed:list', (_e, shotSlotId: string) => listShotCandidates(shotSlotId))
  ipcMain.handle('superposed:append', (_e, input: Parameters<typeof appendShotCandidate>[0]) =>
    appendShotCandidate(input),
  )
  ipcMain.handle('superposed:collapse', (_e, candidateId: string) =>
    collapseShotCandidate(candidateId),
  )
  ipcMain.handle('superposed:archive', (_e, candidateId: string) => {
    archiveShotCandidate(candidateId)
    return { success: true }
  })
  ipcMain.handle('superposed:unresolvedCount', (_e, projectId: string) =>
    countUnresolvedGhosts(projectId),
  )

  ipcMain.handle(
    'palimpsest:append',
    (_e, projectId: string, input: { eventType: string; textSnapshot?: string; userReason?: string; metaphorTags?: string[] }) =>
      appendPalimpsestLayer(projectId, {
        eventType: input.eventType as 'reject',
        textSnapshot: input.textSnapshot,
        userReason: input.userReason,
        metaphorTags: input.metaphorTags ?? [],
        emotionalSignature: { arousal: 0.4, valence: -0.2 },
        vitality: 1,
      }),
  )
  ipcMain.handle('palimpsest:list', (_e, projectId: string) => listPalimpsestLayers(projectId))
  ipcMain.handle(
    'palimpsest:recall',
    (_e, projectId: string, query: { tags?: string[]; layerHint?: number }) =>
      recallPalimpsestLayers(projectId, query),
  )

  ipcMain.handle('chorus:deliberate', async (_e, projectId: string) => {
    const field = getResonanceField(projectId)
    const summary = field.sources.map((s) => `${s.summary.metaphor}(${s.gravity.toFixed(2)})`).join(', ')
    const result = await llmJson<{ utterances: Array<{ voiceId: string; text: string; stance: string }>; resolution: ChorusResolution }>(
      `共鸣场: ${summary || '空'}`,
      `你是内在合唱团编排器。输出 JSON { utterances: [{voiceId, text, stance}], resolution: { tuningAdjustments, promptModifiers, blockers } }。
      voiceId 取 impulse,skeptic,nostalgic,perfectionist,bystander,dormant。每人1-2句中文。`,
    )
    const fallback = {
      utterances: [{ voiceId: 'dormant', text: '……还需要更多共振源。', stance: 'propose' }],
      resolution: normalizeChorusResolution(null),
    }
    if (!result) return fallback
    return {
      utterances: Array.isArray(result.utterances) ? result.utterances : fallback.utterances,
      resolution: normalizeChorusResolution(result.resolution),
    }
  })
  ipcMain.handle(
    'chorus:apply',
    (_e, projectId: string, resolution: ChorusResolution) => {
      const field = applyResolution(getResonanceField(projectId), normalizeChorusResolution(resolution))
      for (const s of field.sources) {
        patchResonanceSource(s.id, { gravity: s.gravity })
      }
      return field
    },
  )

  ipcMain.handle(
    'negentropy:detect',
    async (_e, projectId: string, prompt: string, _assetPath?: string) => {
      const result = await llmJson<{ items: Array<{ id: string; label: string; reason: string; promptTokensToRemove: string[]; negativeTerms: string[]; confidence: number }> }>(
        `Prompt: ${prompt}\n列出显得虚假或过度的元素，JSON items 数组。`,
        'JSON only. 3-6 items.',
      )
      return result?.items ?? [
        {
          id: '1',
          label: '过度修饰词',
          reason: '堆砌',
          promptTokensToRemove: ['masterpiece', '8k', 'best quality'],
          negativeTerms: ['overprocessed'],
          confidence: 0.7,
        },
      ]
    },
  )

  ipcMain.handle('probe:getBudget', (_e, projectId: string) => getProbeBudget(projectId))
  ipcMain.handle('probe:notifyChange', async (_e, projectId: string) => {
    const field = getResonanceField(projectId)
    const compiled = compileResonancePrompt(projectId)
    const promptText = compiled.prompt?.trim()
    if (field.sources.length === 0 || !promptText) {
      return { skipped: true, reason: 'empty_prompt' }
    }
    if (!incrementProbeBudget(projectId)) {
      return { skipped: true, reason: 'budget' }
    }
    try {
      const config = await readConfig()
      const modelId = config.settings.default_image_model
      if (!modelId) {
        return { skipped: true, reason: 'no_image_model' }
      }
      const probeDir = join(getProjectAssetsPath(projectId), '.probe')
      await mkdir(probeDir, { recursive: true })
      const fileName = `ghost-${Date.now()}.png`
      const outPath = join(probeDir, fileName)
      const resultPath = await getUtilityClient().generateImage(modelId, 'fluid-probe', {
        prompt: promptText,
        negativePrompt: compiled.negativePrompt || undefined,
        width: 512,
        height: 288,
      })
      const { copyFile } = await import('fs/promises')
      await copyFile(resultPath, outPath)
      const preview = {
        id: uuid(),
        projectId,
        thumbPath: `.probe/${fileName}`,
        assetPath: `.probe/${fileName}`,
        compiledPrompt: promptText,
        resonanceHash: getRecentResonanceHash(projectId),
        status: 'shown' as const,
        createdAt: new Date().toISOString(),
      }
      saveGhostPreview(preview)
      BrowserWindow.getAllWindows().forEach((w) => {
        w.webContents.send('probe:ready', preview)
      })
      appendFluidEvent(projectId, 'probe_shown', { id: preview.id })
      return preview
    } catch (e) {
      logger.error('probe failed', e)
      return { skipped: true, reason: 'error' }
    }
  })

  ipcMain.handle('crystallize:precheck', (_e, projectId: string, durationSec = 0) => {
    const unresolved = countUnresolvedGhosts(projectId)
    const env = getAffectEnvelope(projectId)
    const cliffs = detectCliffs(env.arousalSeries, env.sampleRate)
    const blockers: string[] = []
    if (unresolved > 0) blockers.push(`${unresolved} 个鬼影未处理`)
    return {
      ok: unresolved === 0,
      collapsedRatio: 1,
      unresolvedGhosts: unresolved,
      pendingCliffs: cliffs.length,
      durationSec,
      blockers,
    }
  })
  ipcMain.handle('crystallize:snapshot', (_e, projectId: string, payload: object) => {
    const db = getDatabase()
    const id = uuid()
    db.prepare(
      'INSERT INTO crystallization_snapshots (id, project_id, mp4_path, duration_sec, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(id, projectId, '', 0, JSON.stringify(payload), new Date().toISOString())
    const state = getFluidState(projectId)
    patchFluidState(projectId, {
      temperature: Math.max(0.1, state.temperature - 0.2),
      viscosity: Math.min(1, state.viscosity + 0.15),
    })
    appendFluidEvent(projectId, 'crystallize_export', {})
    return { id }
  })
  ipcMain.handle('palimpsest:reviveToResonance', (_e, projectId: string, layerId: string) => {
    const layer = listPalimpsestLayers(projectId).find((l) => l.id === layerId)
    if (!layer) return null
    const text = `${METAPHOR_INJECT_PREFIX}${layer.metaphorTags.join(', ')}`
    return createResonanceSource(
      projectId,
      'phrase',
      { text },
      summaryFromPhrase(text),
      vectorFromSummary(summaryFromPhrase(text)),
    )
  })
}

import type { DurationBudgetResult, ScriptProductionMeta, ShotSpec } from '../types/agent'
import type { ScriptRow } from '../types/node'
import { generateId } from './id'

const MIN_DURATION = 1
const MAX_DURATION = 30
const FLF_MIN_DURATION = 3

export function clampShotDuration(
  durationSec: number,
  mode?: ShotSpec['productionMode'],
): number {
  let d = Math.max(MIN_DURATION, Math.min(MAX_DURATION, Math.round(durationSec)))
  if (mode === 'flf' && d < FLF_MIN_DURATION) d = FLF_MIN_DURATION
  return d
}

function appendDialogue(description: string, shot: ShotSpec): string {
  let desc = description
  if (shot.dialogue?.trim()) desc += `\n[对白] ${shot.dialogue.trim()}`
  if (shot.vo?.trim()) desc += `\n[旁白] ${shot.vo.trim()}`
  return desc
}

export function shotSpecToScriptRow(shot: ShotSpec): ScriptRow {
  const duration = clampShotDuration(shot.durationSec, shot.productionMode)
  return {
    id: generateId('shot'),
    sequence: shot.sequence,
    description: appendDialogue(shot.description, shot),
    prompt: shot.prompt,
    duration,
    camera: shot.camera || 'medium',
  }
}

export function shotSpecsToScriptRows(shots: ShotSpec[]): ScriptRow[] {
  return [...shots]
    .sort((a, b) => a.sequence - b.sequence)
    .map(shotSpecToScriptRow)
}

export function buildProductionMeta(
  shots: ShotSpec[],
  brief?: ScriptProductionMeta['brief'],
  appliedFrom?: ScriptProductionMeta['appliedFrom'],
): ScriptProductionMeta {
  return {
    brief,
    shots: shots.map((s) => ({
      sequence: s.sequence,
      beat: s.beat,
      sceneId: s.sceneId,
      mode: s.productionMode,
    })),
    appliedFrom,
  }
}

export function validateDurationBudget(
  shots: ShotSpec[],
  targetSec: number,
): DurationBudgetResult {
  const sumSec = shots.reduce(
    (sum, s) => sum + clampShotDuration(s.durationSec, s.productionMode),
    0,
  )
  const deltaSec = sumSec - targetSec
  const absDelta = Math.abs(deltaSec)
  const warnThreshold = Math.max(2, targetSec * 0.1)

  let level: DurationBudgetResult['level'] = 'block'
  if (absDelta <= 2) level = 'ok'
  else if (absDelta <= warnThreshold) level = 'warn'

  return {
    ok: level !== 'block',
    targetSec,
    sumSec,
    deltaSec,
    level,
  }
}

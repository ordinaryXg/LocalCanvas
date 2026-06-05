import { v4 as uuid } from 'uuid'
import { getDatabase } from '../database'
import type {
  AffectEnvelope,
  FluidEvent,
  FluidState,
  GhostPreview,
  PalimpsestLayer,
  ResonanceField,
  ResonanceSource,
  ResonanceSourceType,
  ShotCandidate,
  ShotSlotBinding,
} from '../../../src/types/fluid'
import { createDefaultEnvelope, computeTemperature } from '../../utility/services/fluid/affect-math'
import { compilePrompt } from '../../utility/services/fluid/compile-prompt'
import { hashResonance } from '../../utility/services/fluid/fluid-compiler'

const DEFAULT_FLUID: Omit<FluidState, 'projectId' | 'updatedAt'> = {
  temperature: 0.55,
  viscosity: 0.35,
  surfaceTension: 0.5,
  phase: 'explore',
  userTemperatureOverride: null,
  lastSessionEndedAt: null,
  crystallizedShotIds: [],
}

export function getFluidState(projectId: string): FluidState {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM fluid_state WHERE project_id = ?').get(projectId) as
    | Record<string, unknown>
    | undefined
  if (!row) {
    const now = new Date().toISOString()
    const state: FluidState = { projectId, ...DEFAULT_FLUID, updatedAt: now }
    db.prepare(
      `INSERT INTO fluid_state (project_id, temperature, viscosity, surface_tension, phase,
        user_temperature_override, last_session_ended_at, crystallized_shot_ids, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      projectId,
      state.temperature,
      state.viscosity,
      state.surfaceTension,
      state.phase,
      null,
      null,
      '[]',
      now,
    )
    return state
  }
  return rowToFluid(row)
}

export function patchFluidState(projectId: string, patch: Partial<FluidState>): FluidState {
  const current = getFluidState(projectId)
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() }
  const db = getDatabase()
  db.prepare(
    `UPDATE fluid_state SET temperature=?, viscosity=?, surface_tension=?, phase=?,
      user_temperature_override=?, last_session_ended_at=?, crystallized_shot_ids=?, updated_at=?
     WHERE project_id=?`,
  ).run(
    next.temperature,
    next.viscosity,
    next.surfaceTension,
    next.phase,
    next.userTemperatureOverride,
    next.lastSessionEndedAt,
    JSON.stringify(next.crystallizedShotIds),
    next.updatedAt,
    projectId,
  )
  return next
}

export function endFluidSession(projectId: string): void {
  patchFluidState(projectId, { lastSessionEndedAt: new Date().toISOString() })
}

export function appendFluidEvent(
  projectId: string,
  eventName: string,
  payload?: Record<string, unknown>,
): FluidEvent {
  const db = getDatabase()
  const event: FluidEvent = {
    id: uuid(),
    projectId,
    eventName,
    payload,
    createdAt: new Date().toISOString(),
  }
  db.prepare(
    'INSERT INTO fluid_events (id, project_id, event_name, payload, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(event.id, projectId, eventName, payload ? JSON.stringify(payload) : null, event.createdAt)
  return event
}

export function listFluidEvents(projectId: string, limit = 20): FluidEvent[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      'SELECT * FROM fluid_events WHERE project_id = ? ORDER BY created_at DESC LIMIT ?',
    )
    .all(projectId, limit) as Record<string, unknown>[]
  return rows.map((r) => ({
    id: String(r.id),
    projectId: String(r.project_id),
    eventName: String(r.event_name),
    payload: r.payload ? (JSON.parse(String(r.payload)) as Record<string, unknown>) : undefined,
    createdAt: String(r.created_at),
  }))
}

export function listResonanceSources(projectId: string): ResonanceSource[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM resonance_sources WHERE project_id = ? ORDER BY orbit_index')
    .all(projectId) as Record<string, unknown>[]
  return rows.map(rowToResonance)
}

export function getResonanceField(projectId: string): ResonanceField {
  return { projectId, sources: listResonanceSources(projectId) }
}

export function createResonanceSource(
  projectId: string,
  type: ResonanceSourceType,
  payload: ResonanceSource['payload'],
  summary: ResonanceSource['summary'],
  vector: number[],
): ResonanceSource {
  const db = getDatabase()
  const count = db
    .prepare('SELECT COUNT(*) as c FROM resonance_sources WHERE project_id = ?')
    .get(projectId) as { c: number }
  const source: ResonanceSource = {
    id: uuid(),
    projectId,
    type,
    payload,
    vector,
    summary,
    gravity: 0.5,
    orbitIndex: count.c,
    createdAt: new Date().toISOString(),
  }
  db.prepare(
    `INSERT INTO resonance_sources (id, project_id, type, payload, vector, summary, gravity, orbit_index, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    source.id,
    projectId,
    source.type,
    JSON.stringify(source.payload),
    JSON.stringify(source.vector),
    JSON.stringify(source.summary),
    source.gravity,
    source.orbitIndex,
    source.createdAt,
  )
  appendFluidEvent(projectId, 'resonance_source_added', { type, id: source.id })
  return source
}

export function patchResonanceSource(
  id: string,
  patch: Partial<Pick<ResonanceSource, 'gravity' | 'summary' | 'orbitIndex'>>,
): ResonanceSource | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM resonance_sources WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!row) return null
  const current = rowToResonance(row)
  const next = { ...current, ...patch }
  db.prepare(
    'UPDATE resonance_sources SET gravity=?, summary=?, orbit_index=? WHERE id=?',
  ).run(next.gravity, JSON.stringify(next.summary), next.orbitIndex, id)
  return next
}

export function deleteResonanceSource(id: string): void {
  getDatabase().prepare('DELETE FROM resonance_sources WHERE id = ?').run(id)
}

export function compileResonancePrompt(projectId: string) {
  return compilePrompt('', getResonanceField(projectId))
}

export function getAffectEnvelope(projectId: string): AffectEnvelope {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM affect_envelope WHERE project_id = ?').get(projectId) as
    | Record<string, unknown>
    | undefined
  if (!row) {
    const env = createDefaultEnvelope(projectId)
    saveAffectEnvelope(env)
    return env
  }
  return {
    projectId,
    durationSec: Number(row.duration_sec),
    sampleRate: Number(row.sample_rate),
    arousalSeries: JSON.parse(String(row.arousal_series)) as number[],
    valenceSeries: JSON.parse(String(row.valence_series)) as number[],
    anchors: JSON.parse(String(row.anchors)) as AffectEnvelope['anchors'],
    updatedAt: String(row.updated_at),
  }
}

export function saveAffectEnvelope(env: AffectEnvelope): void {
  const db = getDatabase()
  db.prepare(
    `INSERT INTO affect_envelope (project_id, duration_sec, sample_rate, arousal_series, valence_series, anchors, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(project_id) DO UPDATE SET
       duration_sec=excluded.duration_sec, sample_rate=excluded.sample_rate,
       arousal_series=excluded.arousal_series, valence_series=excluded.valence_series,
       anchors=excluded.anchors, updated_at=excluded.updated_at`,
  ).run(
    env.projectId,
    env.durationSec,
    env.sampleRate,
    JSON.stringify(env.arousalSeries),
    JSON.stringify(env.valenceSeries),
    JSON.stringify(env.anchors),
    env.updatedAt,
  )
}

export function listShotCandidates(shotSlotId: string): ShotCandidate[] {
  const rows = getDatabase()
    .prepare(
      "SELECT * FROM shot_candidates WHERE shot_slot_id = ? AND status = 'active' ORDER BY created_at",
    )
    .all(shotSlotId) as Record<string, unknown>[]
  return rows.map(rowToCandidate)
}

export function appendShotCandidate(input: {
  projectId: string
  shotSlotId: string
  assetPath: string
  thumbPath: string
  promptSnapshot: string
  resonanceHash?: string
}): ShotCandidate {
  const db = getDatabase()
  const active = listShotCandidates(input.shotSlotId)
  if (active.length >= 4) {
    const oldest = active[0]
    db.prepare("UPDATE shot_candidates SET status='archived' WHERE id=?").run(oldest.id)
  }
  const isPrimary = active.length === 0
  const c: ShotCandidate = {
    id: uuid(),
    shotSlotId: input.shotSlotId,
    projectId: input.projectId,
    assetPath: input.assetPath,
    thumbPath: input.thumbPath,
    probability: 1 / (active.length + 1),
    isPrimary,
    promptSnapshot: input.promptSnapshot,
    resonanceHash: input.resonanceHash,
    status: 'active',
    createdAt: new Date().toISOString(),
  }
  db.prepare(
    `INSERT INTO shot_candidates (id, shot_slot_id, project_id, asset_path, thumb_path, probability,
      is_primary, prompt_snapshot, resonance_hash, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    c.id,
    c.shotSlotId,
    c.projectId,
    c.assetPath,
    c.thumbPath,
    c.probability,
    isPrimary ? 1 : 0,
    c.promptSnapshot,
    c.resonanceHash ?? null,
    c.status,
    c.createdAt,
  )
  if (!isPrimary) {
    const prob = 1 / (active.length + 1)
    for (const a of active) {
      db.prepare('UPDATE shot_candidates SET probability=?, is_primary=0 WHERE id=?').run(prob, a.id)
    }
  }
  appendFluidEvent(input.projectId, 'superposed_appended', { shotSlotId: input.shotSlotId })
  recalcFluidTemperature(input.projectId)
  return c
}

export function collapseShotCandidate(candidateId: string): ShotCandidate | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM shot_candidates WHERE id = ?').get(candidateId) as
    | Record<string, unknown>
    | undefined
  if (!row) return null
  const c = rowToCandidate(row)
  db.prepare('UPDATE shot_candidates SET is_primary=0 WHERE shot_slot_id=?').run(c.shotSlotId)
  db.prepare('UPDATE shot_candidates SET is_primary=1 WHERE id=?').run(candidateId)
  appendFluidEvent(c.projectId, 'superposed_collapsed', { candidateId })
  return { ...c, isPrimary: true }
}

export function archiveShotCandidate(candidateId: string): void {
  getDatabase().prepare("UPDATE shot_candidates SET status='archived' WHERE id=?").run(candidateId)
}

export function countUnresolvedGhosts(projectId: string): number {
  const row = getDatabase()
    .prepare(
      `SELECT COUNT(*) as c FROM shot_candidates WHERE project_id=? AND status='active' AND is_primary=0`,
    )
    .get(projectId) as { c: number }
  return row.c
}

export function upsertShotBindings(projectId: string, bindings: ShotSlotBinding[]): void {
  const db = getDatabase()
  const del = db.prepare('DELETE FROM shot_slot_bindings WHERE project_id = ?')
  const ins = db.prepare(
    `INSERT INTO shot_slot_bindings (shot_slot_id, project_id, node_id, node_type, cell_index, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
  db.transaction(() => {
    del.run(projectId)
    for (const b of bindings) {
      ins.run(b.shotSlotId, projectId, b.nodeId, b.nodeType, b.cellIndex ?? null, b.createdAt)
    }
  })()
}

export function appendPalimpsestLayer(
  projectId: string,
  input: Omit<PalimpsestLayer, 'id' | 'projectId' | 'depth' | 'createdAt'>,
): PalimpsestLayer {
  const db = getDatabase()
  const max = db
    .prepare('SELECT COALESCE(MAX(depth), 0) as d FROM palimpsest_layers WHERE project_id = ?')
    .get(projectId) as { d: number }
  const layer: PalimpsestLayer = {
    id: uuid(),
    projectId,
    depth: max.d + 1,
    ...input,
    createdAt: new Date().toISOString(),
  }
  db.prepare(
    `INSERT INTO palimpsest_layers (id, project_id, depth, event_type, payload, metaphor_tags,
      emotional_signature, vitality, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    layer.id,
    projectId,
    layer.depth,
    layer.eventType,
    JSON.stringify({ assetPath: layer.assetPath, textSnapshot: layer.textSnapshot, userReason: layer.userReason }),
    JSON.stringify(layer.metaphorTags),
    JSON.stringify(layer.emotionalSignature),
    layer.vitality,
    layer.createdAt,
  )
  return layer
}

export function listPalimpsestLayers(projectId: string): PalimpsestLayer[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM palimpsest_layers WHERE project_id = ? ORDER BY depth DESC')
    .all(projectId) as Record<string, unknown>[]
  return rows.map(rowToLayer)
}

export function recallPalimpsestLayers(
  projectId: string,
  query: { tags?: string[]; layerHint?: number },
): PalimpsestLayer[] {
  const layers = listPalimpsestLayers(projectId).filter((l) => l.vitality > 0)
  const scored = layers.map((l) => {
    let s = 0
    if (query.layerHint != null && l.depth === query.layerHint) s += 0.5
    if (query.tags) {
      const setA = new Set(query.tags.map((t) => t.toLowerCase()))
      const overlap = l.metaphorTags.filter((t) => setA.has(t.toLowerCase())).length
      s += overlap * 0.2
    }
    return { l, s }
  })
  return scored
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map((x) => x.l)
}

export function getProbeBudget(projectId: string): { used: number; limit: number } {
  const db = getDatabase()
  const date = new Date().toISOString().slice(0, 10)
  const row = db
    .prepare('SELECT used, limit_count FROM probe_budget WHERE project_id=? AND date=?')
    .get(projectId, date) as { used: number; limit_count: number } | undefined
  return { used: row?.used ?? 0, limit: row?.limit_count ?? 20 }
}

export function incrementProbeBudget(projectId: string): boolean {
  const db = getDatabase()
  const date = new Date().toISOString().slice(0, 10)
  const { used, limit } = getProbeBudget(projectId)
  if (used >= limit) return false
  db.prepare(
    `INSERT INTO probe_budget (project_id, date, used, limit_count) VALUES (?, ?, 1, 20)
     ON CONFLICT(project_id, date) DO UPDATE SET used = used + 1`,
  ).run(projectId, date)
  return true
}

export function saveGhostPreview(preview: GhostPreview): void {
  getDatabase()
    .prepare(
      `INSERT INTO ghost_previews (id, project_id, thumb_path, asset_path, compiled_prompt, resonance_hash, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      preview.id,
      preview.projectId,
      preview.thumbPath,
      preview.assetPath,
      preview.compiledPrompt,
      preview.resonanceHash,
      preview.status,
      preview.createdAt,
    )
}

export function getRecentResonanceHash(projectId: string): string {
  return hashResonance(getResonanceField(projectId))
}

export function recalcFluidTemperature(projectId: string): void {
  const ghosts = countUnresolvedGhosts(projectId)
  const state = getFluidState(projectId)
  const hours = state.lastSessionEndedAt
    ? (Date.now() - new Date(state.lastSessionEndedAt).getTime()) / 3600000
    : 24
  const crystallizedRatio =
    state.crystallizedShotIds.length > 0 ? Math.min(1, state.crystallizedShotIds.length / 10) : 0
  const auto = computeTemperature({
    openSuperposedCount: ghosts,
    recentEditCount24h: listFluidEvents(projectId, 50).length,
    crystallizedRatio,
    hoursSinceLastSession: hours,
  })
  if (state.userTemperatureOverride == null) {
    patchFluidState(projectId, { temperature: auto })
  }
}

function rowToFluid(row: Record<string, unknown>): FluidState {
  return {
    projectId: String(row.project_id),
    temperature: Number(row.temperature),
    viscosity: Number(row.viscosity),
    surfaceTension: Number(row.surface_tension),
    phase: row.phase as FluidState['phase'],
    userTemperatureOverride:
      row.user_temperature_override != null ? Number(row.user_temperature_override) : null,
    lastSessionEndedAt: row.last_session_ended_at ? String(row.last_session_ended_at) : null,
    crystallizedShotIds: JSON.parse(String(row.crystallized_shot_ids)) as string[],
    updatedAt: String(row.updated_at),
  }
}

function rowToResonance(row: Record<string, unknown>): ResonanceSource {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    type: row.type as ResonanceSourceType,
    payload: JSON.parse(String(row.payload)) as ResonanceSource['payload'],
    vector: JSON.parse(String(row.vector)) as number[],
    summary: JSON.parse(String(row.summary)) as ResonanceSource['summary'],
    gravity: Number(row.gravity),
    orbitIndex: Number(row.orbit_index),
    createdAt: String(row.created_at),
  }
}

function rowToCandidate(row: Record<string, unknown>): ShotCandidate {
  return {
    id: String(row.id),
    shotSlotId: String(row.shot_slot_id),
    projectId: String(row.project_id),
    assetPath: String(row.asset_path),
    thumbPath: String(row.thumb_path),
    probability: Number(row.probability),
    isPrimary: Boolean(row.is_primary),
    promptSnapshot: String(row.prompt_snapshot ?? ''),
    resonanceHash: row.resonance_hash ? String(row.resonance_hash) : undefined,
    status: row.status as ShotCandidate['status'],
    createdAt: String(row.created_at),
  }
}

function rowToLayer(row: Record<string, unknown>): PalimpsestLayer {
  const payload = JSON.parse(String(row.payload)) as {
    assetPath?: string
    textSnapshot?: string
    userReason?: string
  }
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    depth: Number(row.depth),
    eventType: row.event_type as PalimpsestLayer['eventType'],
    assetPath: payload.assetPath,
    textSnapshot: payload.textSnapshot,
    userReason: payload.userReason,
    metaphorTags: JSON.parse(String(row.metaphor_tags)) as string[],
    emotionalSignature: JSON.parse(String(row.emotional_signature)) as PalimpsestLayer['emotionalSignature'],
    vitality: Number(row.vitality),
    createdAt: String(row.created_at),
  }
}

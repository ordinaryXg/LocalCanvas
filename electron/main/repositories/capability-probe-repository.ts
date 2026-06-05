import { getDatabase } from '../database'
import type { ModelCapabilityProfile, ModelKind } from '../../../src/types/capability'

export interface CapabilityProbeRow {
  config_id: string
  kind: ModelKind
  profile_json: string
  confidence: string
  probed_at: string
  expires_at: string
}

export class CapabilityProbeRepository {
  upsert(entry: {
    configId: string
    kind: ModelKind
    profile: ModelCapabilityProfile
    probedAt: string
    expiresAt: string
  }): void {
    const db = getDatabase()
    db.prepare(
      `INSERT INTO capability_probe_cache (config_id, kind, profile_json, confidence, probed_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(config_id) DO UPDATE SET
         kind = excluded.kind,
         profile_json = excluded.profile_json,
         confidence = excluded.confidence,
         probed_at = excluded.probed_at,
         expires_at = excluded.expires_at`,
    ).run(
      entry.configId,
      entry.kind,
      JSON.stringify(entry.profile),
      entry.profile.confidence,
      entry.probedAt,
      entry.expiresAt,
    )
  }

  get(configId: string, nowIso = new Date().toISOString()): ModelCapabilityProfile | null {
    const db = getDatabase()
    const row = db
      .prepare(
        `SELECT profile_json FROM capability_probe_cache
         WHERE config_id = ? AND expires_at > ?`,
      )
      .get(configId, nowIso) as { profile_json: string } | undefined
    if (!row) return null
    return JSON.parse(row.profile_json) as ModelCapabilityProfile
  }

  listValid(nowIso = new Date().toISOString()): Array<{
    configId: string
    profile: ModelCapabilityProfile
    probedAt: string
  }> {
    const db = getDatabase()
    const rows = db
      .prepare(
        `SELECT config_id, profile_json, probed_at FROM capability_probe_cache
         WHERE expires_at > ?`,
      )
      .all(nowIso) as Array<{
      config_id: string
      profile_json: string
      probed_at: string
    }>
    return rows.map((row) => ({
      configId: row.config_id,
      profile: JSON.parse(row.profile_json) as ModelCapabilityProfile,
      probedAt: row.probed_at,
    }))
  }

  purgeExpired(nowIso = new Date().toISOString()): void {
    const db = getDatabase()
    db.prepare('DELETE FROM capability_probe_cache WHERE expires_at <= ?').run(nowIso)
  }
}

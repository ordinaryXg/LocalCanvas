import { getDatabase } from '../database'
import type { Confidence, ModelKind } from '../../../src/types/capability'

export interface CapabilityCacheRow {
  id: string
  provider_key: string
  provider: string
  model_id: string
  kind: ModelKind
  profile_key: string
  in_catalog: number
  confidence: Confidence
  synced_at: string
  expires_at: string
  catalog_version: number
}

export interface CapabilitySyncMetaRow {
  provider_key: string
  provider: string
  endpoint: string
  last_sync_at: string | null
  last_error: string | null
  model_count: number
}

export class CapabilityCacheRepository {
  upsertModel(entry: {
    provider_key: string
    provider: string
    model_id: string
    kind: ModelKind
    profile_key: string
    in_catalog: boolean
    confidence: Confidence
    synced_at: string
    expires_at: string
    catalog_version: number
  }): void {
    const db = getDatabase()
    const id = entry.model_id
    db.prepare(
      `INSERT INTO capability_cache (
        id, provider_key, provider, model_id, kind, profile_key, in_catalog,
        confidence, synced_at, expires_at, catalog_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        provider_key = excluded.provider_key,
        provider = excluded.provider,
        kind = excluded.kind,
        profile_key = excluded.profile_key,
        in_catalog = excluded.in_catalog,
        confidence = excluded.confidence,
        synced_at = excluded.synced_at,
        expires_at = excluded.expires_at,
        catalog_version = excluded.catalog_version`,
    ).run(
      id,
      entry.provider_key,
      entry.provider,
      entry.model_id,
      entry.kind,
      entry.profile_key,
      entry.in_catalog ? 1 : 0,
      entry.confidence,
      entry.synced_at,
      entry.expires_at,
      entry.catalog_version,
    )
  }

  upsertSyncMeta(entry: {
    provider_key: string
    provider: string
    endpoint: string
    last_sync_at: string | null
    last_error: string | null
    model_count: number
  }): void {
    const db = getDatabase()
    db.prepare(
      `INSERT INTO capability_sync_meta (
        provider_key, provider, endpoint, last_sync_at, last_error, model_count
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(provider_key) DO UPDATE SET
        provider = excluded.provider,
        endpoint = excluded.endpoint,
        last_sync_at = excluded.last_sync_at,
        last_error = excluded.last_error,
        model_count = excluded.model_count`,
    ).run(
      entry.provider_key,
      entry.provider,
      entry.endpoint,
      entry.last_sync_at,
      entry.last_error,
      entry.model_count,
    )
  }

  listValidCache(nowIso = new Date().toISOString()): CapabilityCacheRow[] {
    const db = getDatabase()
    return db
      .prepare(
        `SELECT * FROM capability_cache
         WHERE expires_at > ?
         ORDER BY in_catalog DESC, model_id ASC`,
      )
      .all(nowIso) as CapabilityCacheRow[]
  }

  listSyncMeta(): CapabilitySyncMetaRow[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM capability_sync_meta ORDER BY provider ASC').all() as CapabilitySyncMetaRow[]
  }

  getLatestSyncAt(): string | null {
    const db = getDatabase()
    const row = db
      .prepare(
        `SELECT MAX(last_sync_at) AS last_sync_at FROM capability_sync_meta WHERE last_sync_at IS NOT NULL`,
      )
      .get() as { last_sync_at: string | null } | undefined
    return row?.last_sync_at ?? null
  }

  purgeExpired(nowIso = new Date().toISOString()): void {
    const db = getDatabase()
    db.prepare('DELETE FROM capability_cache WHERE expires_at <= ?').run(nowIso)
  }

  purgeUnmapped(): void {
    const db = getDatabase()
    db.prepare('DELETE FROM capability_cache WHERE in_catalog = 0').run()
  }

  countValid(nowIso = new Date().toISOString()): number {
    const db = getDatabase()
    const row = db
      .prepare('SELECT COUNT(*) AS count FROM capability_cache WHERE expires_at > ?')
      .get(nowIso) as { count: number }
    return row.count
  }
}

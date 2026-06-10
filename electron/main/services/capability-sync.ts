import axios from 'axios'
import { readConfig } from './config'
import { logger } from './logger'
import { CapabilityCacheRepository } from '../repositories/capability-cache-repository'
import {
  buildModelsListUrl,
  cacheTtlMs,
  collectSyncCredentialSources,
  getCatalogVersionForSync,
  isModelAlreadyConfigured,
  isPresetAlreadyConfigured,
  mapDiscoveredModel,
  parseModelsListResponse,
  shouldCacheDiscoveredModel,
  shouldShowDiscoveredModel,
  supplementDiscoveredWithCatalog,
} from '../../../src/capabilities/l2-sync'
import type {
  CapabilityCacheStatus,
  CapabilitySyncResult,
  DiscoveredModelEntry,
} from '../../../src/types/capability-sync'

const DAILY_SYNC_MS = 24 * 60 * 60 * 1000
const repo = new CapabilityCacheRepository()

async function fetchModelsForSource(
  provider: string,
  endpoint: string,
  apiKey: string,
): Promise<string[]> {
  const url = buildModelsListUrl(provider, endpoint)
  if (!url) {
    throw new Error('该 Provider 暂不支持 L2 模型列表同步')
  }
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 15000,
  })
  return parseModelsListResponse(res.data)
}

export async function syncCapabilityCache(): Promise<CapabilitySyncResult> {
  const config = await readConfig()
  const sources = collectSyncCredentialSources(config)
  const syncedAt = new Date().toISOString()
  const catalogVersion = getCatalogVersionForSync()
  const sourceResults: CapabilitySyncResult['sources'] = []

  repo.purgeExpired(syncedAt)
  repo.purgeUnmapped()

  if (sources.length === 0) {
    return {
      ok: true,
      syncedAt,
      catalogVersion,
      sources: [],
      discovered: buildDiscoveredList(config),
    }
  }

  for (const source of sources) {
    try {
      const modelIds = await fetchModelsForSource(
        source.provider,
        source.endpoint,
        source.api_key,
      )
      for (const modelId of modelIds) {
        const mapped = mapDiscoveredModel(modelId, source.hint_kind)
        if (!shouldCacheDiscoveredModel(mapped) || mapped.kind === null) continue
        const expiresAt = new Date(
          Date.now() + cacheTtlMs(mapped.profile.confidence),
        ).toISOString()
        repo.upsertModel({
          provider_key: source.provider_key,
          provider: source.provider,
          model_id: modelId,
          kind: mapped.kind,
          profile_key: mapped.profile.profile_key,
          in_catalog: mapped.in_catalog,
          confidence: mapped.profile.confidence,
          synced_at: syncedAt,
          expires_at: expiresAt,
          catalog_version: catalogVersion,
        })
      }
      repo.upsertSyncMeta({
        provider_key: source.provider_key,
        provider: source.provider,
        endpoint: source.endpoint,
        last_sync_at: syncedAt,
        last_error: null,
        model_count: modelIds.length,
      })
      sourceResults.push({
        provider_key: source.provider_key,
        provider: source.provider,
        ok: true,
        modelCount: modelIds.length,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.warn('capability sync source failed', { source: source.provider_key, message })
      repo.upsertSyncMeta({
        provider_key: source.provider_key,
        provider: source.provider,
        endpoint: source.endpoint,
        last_sync_at: null,
        last_error: message,
        model_count: 0,
      })
      sourceResults.push({
        provider_key: source.provider_key,
        provider: source.provider,
        ok: false,
        modelCount: 0,
        error: message,
      })
    }
  }

  const discovered = buildDiscoveredList(config)
  return {
    ok: sourceResults.some((s) => s.ok),
    syncedAt,
    catalogVersion,
    sources: sourceResults,
    discovered,
  }
}

function buildDiscoveredList(config: Awaited<ReturnType<typeof readConfig>>): DiscoveredModelEntry[] {
  const rows = repo.listValidCache()
  const seen = new Set<string>()
  const entries: DiscoveredModelEntry[] = []

  for (const row of rows) {
    if (seen.has(row.model_id)) continue
    seen.add(row.model_id)

    const mapped = mapDiscoveredModel(row.model_id)
    if (!shouldShowDiscoveredModel(mapped) || mapped.kind === null) continue

    const preset = mapped.preset
    const alreadyAdded =
      isModelAlreadyConfigured(config, row.model_id) ||
      (preset ? isPresetAlreadyConfigured(config, preset.id) : false)

    if (alreadyAdded) continue

    entries.push({
      model_id: row.model_id,
      kind: mapped.kind,
      profile_key: mapped.profile.profile_key,
      display_name: mapped.profile.display_name,
      in_catalog: row.in_catalog === 1,
      already_added: false,
      has_preset: Boolean(preset),
      preset_id: preset?.id,
      confidence: mapped.profile.confidence,
    })
  }

  return supplementDiscoveredWithCatalog(config, entries)
}

export async function getCapabilityCacheStatus(): Promise<CapabilityCacheStatus> {
  const config = await readConfig()
  repo.purgeUnmapped()
  const rows = repo.listValidCache()
  const meta = repo.listSyncMeta()
  const discovered = buildDiscoveredList(config)
  const unmapped = rows.filter((r) => r.in_catalog === 0)

  return {
    catalogVersion: getCatalogVersionForSync(),
    lastSyncedAt: repo.getLatestSyncAt(),
    totalCached: repo.countValid(),
    discoveredCount: discovered.length,
    unmappedCount: unmapped.length,
    discovered,
    sources: meta.map((m) => ({
      provider_key: m.provider_key,
      provider: m.provider,
      endpoint: m.endpoint,
      last_sync_at: m.last_sync_at,
      last_error: m.last_error,
      model_count: m.model_count,
    })),
  }
}

export async function maybeSyncCapabilityCacheDaily(): Promise<void> {
  try {
    const lastSyncedAt = repo.getLatestSyncAt()
    if (lastSyncedAt) {
      const elapsed = Date.now() - new Date(lastSyncedAt).getTime()
      if (elapsed < DAILY_SYNC_MS) return
    }
    const config = await readConfig()
    if (collectSyncCredentialSources(config).length === 0) return
    await syncCapabilityCache()
  } catch (err) {
    logger.warn('daily capability sync skipped', err)
  }
}

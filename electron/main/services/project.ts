import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, rmSync, writeFileSync, copyFileSync } from 'fs'
import { v4 as uuid } from 'uuid'
import { getDatabase } from '../database'
import { listAssets } from './asset'
import { getThumbnail } from './thumbnail'
import { logger } from './logger'

export interface ProjectSummary {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  hasThumbnail?: boolean
}

export interface ProjectData {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  viewport: { x: number; y: number; zoom: number }
  nodes: ProjectNode[]
  edges: ProjectEdge[]
  groups: ProjectGroup[]
}

export interface ProjectNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
  parentId?: string
  style?: Record<string, unknown>
  width?: number
  height?: number
}

export interface ProjectEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  type?: string
  data?: Record<string, unknown>
}

export interface ProjectGroup {
  id: string
  label: string
  position: { x: number; y: number }
  width: number
  height: number
}

function projectsDir(): string {
  const dir = join(app.getPath('userData'), 'LocalCanvas', 'projects')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function projectAssetsDir(projectId: string): string {
  const dir = join(projectsDir(), projectId, 'assets')
  const subdirs = ['images', 'videos', 'audios']
  for (const sub of subdirs) {
    const p = join(dir, sub)
    if (!existsSync(p)) mkdirSync(p, { recursive: true })
  }
  const workflows = join(projectsDir(), projectId, 'workflows')
  if (!existsSync(workflows)) mkdirSync(workflows, { recursive: true })
  return dir
}

export function createProject(name: string): ProjectData {
  const db = getDatabase()
  const id = uuid()
  const now = new Date().toISOString()

  projectAssetsDir(id)

  const project: ProjectData = {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes: [],
    edges: [],
    groups: [],
  }

  const maxOrder = db
    .prepare('SELECT COALESCE(MAX(list_order), -1) AS m FROM projects')
    .get() as { m: number }

  db.prepare(
    `INSERT INTO projects (id, name, created_at, updated_at, viewport_x, viewport_y, viewport_zoom, list_order)
     VALUES (?, ?, ?, ?, 0, 0, 1, ?)`,
  ).run(id, name, now, now, maxOrder.m + 1)

  logger.info('Project created', id, name)
  return project
}

export function loadProject(projectId: string): ProjectData {
  const db = getDatabase()

  const row = db
    .prepare('SELECT * FROM projects WHERE id = ?')
    .get(projectId) as Record<string, unknown> | undefined

  if (!row) {
    throw new Error(`Project not found: ${projectId}`)
  }

  const nodes = db
    .prepare('SELECT * FROM nodes WHERE project_id = ?')
    .all(projectId) as Array<Record<string, unknown>>

  const edges = db
    .prepare('SELECT * FROM edges WHERE project_id = ?')
    .all(projectId) as Array<Record<string, unknown>>

  const groups = db
    .prepare('SELECT * FROM groups WHERE project_id = ?')
    .all(projectId) as Array<Record<string, unknown>>

  return {
    id: row.id as string,
    name: row.name as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    viewport: {
      x: row.viewport_x as number,
      y: row.viewport_y as number,
      zoom: row.viewport_zoom as number,
    },
    nodes: nodes.map((n) => ({
      id: n.id as string,
      type: n.type as string,
      position: { x: n.position_x as number, y: n.position_y as number },
      data: JSON.parse((n.data as string) || '{}'),
      parentId: n.parent_id as string | undefined,
      style: n.style ? JSON.parse(n.style as string) : undefined,
      width: n.width as number | undefined,
      height: n.height as number | undefined,
    })),
    edges: edges.map((e) => ({
      id: e.id as string,
      source: e.source as string,
      target: e.target as string,
      sourceHandle: e.source_handle as string | null,
      targetHandle: e.target_handle as string | null,
      type: e.type as string,
      data: JSON.parse((e.data as string) || '{}'),
    })),
    groups: groups.map((g) => ({
      id: g.id as string,
      label: g.label as string,
      position: { x: g.position_x as number, y: g.position_y as number },
      width: g.width as number,
      height: g.height as number,
    })),
  }
}

export function saveProject(data: ProjectData): void {
  const db = getDatabase()
  const now = new Date().toISOString()

  const saveAll = db.transaction(() => {
    db.prepare(
      `UPDATE projects SET name = ?, updated_at = ?, viewport_x = ?, viewport_y = ?, viewport_zoom = ?
       WHERE id = ?`,
    ).run(
      data.name,
      now,
      data.viewport.x,
      data.viewport.y,
      data.viewport.zoom,
      data.id,
    )

    db.prepare('DELETE FROM nodes WHERE project_id = ?').run(data.id)
    db.prepare('DELETE FROM edges WHERE project_id = ?').run(data.id)
    db.prepare('DELETE FROM groups WHERE project_id = ?').run(data.id)

    const insertNode = db.prepare(
      `INSERT INTO nodes (id, project_id, type, position_x, position_y, data, parent_id, style, width, height)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    for (const node of data.nodes) {
      insertNode.run(
        node.id,
        data.id,
        node.type,
        node.position.x,
        node.position.y,
        JSON.stringify(node.data),
        node.parentId ?? null,
        node.style ? JSON.stringify(node.style) : null,
        node.width ?? null,
        node.height ?? null,
      )
    }

    const insertEdge = db.prepare(
      `INSERT INTO edges (id, project_id, source, target, source_handle, target_handle, type, data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    for (const edge of data.edges) {
      insertEdge.run(
        edge.id,
        data.id,
        edge.source,
        edge.target,
        edge.sourceHandle ?? null,
        edge.targetHandle ?? null,
        edge.type ?? 'smoothstep',
        JSON.stringify(edge.data ?? {}),
      )
    }

    const insertGroup = db.prepare(
      `INSERT INTO groups (id, project_id, label, position_x, position_y, width, height)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    for (const group of data.groups) {
      insertGroup.run(
        group.id,
        data.id,
        group.label,
        group.position.x,
        group.position.y,
        group.width,
        group.height,
      )
    }
  })

  saveAll()
  logger.debug('Project saved', data.id)
}

export function listProjects(): ProjectSummary[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      'SELECT id, name, created_at, updated_at FROM projects ORDER BY list_order ASC, updated_at DESC',
    )
    .all() as Array<{ id: string; name: string; created_at: string; updated_at: string }>

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    hasThumbnail: existsSync(getProjectThumbnailPath(r.id)),
  }))
}

export function reorderProjects(orderedIds: string[]): void {
  const db = getDatabase()
  const update = db.prepare('UPDATE projects SET list_order = ? WHERE id = ?')
  db.transaction(() => {
    orderedIds.forEach((id, index) => update.run(index, id))
  })()
  logger.debug('Projects reordered', orderedIds.length)
}

export function getProjectThumbnailPath(projectId: string): string {
  return join(projectsDir(), projectId, 'thumbnail.jpg')
}

export async function refreshProjectThumbnail(
  projectId: string,
  nodes: ProjectNode[],
): Promise<void> {
  const thumbPath = getProjectThumbnailPath(projectId)
  const assetsBase = getProjectAssetsPath(projectId)

  const tryImage = (relativePath: string | undefined): boolean => {
    if (!relativePath) return false
    const src = join(assetsBase, relativePath)
    if (!existsSync(src)) return false
    copyFileSync(src, thumbPath)
    return true
  }

  for (const node of nodes) {
    const data = node.data
    if (node.type === 'image' && tryImage(data.imageAssetPath as string | undefined)) return
    if (node.type === 'video' && data.videoAssetPath) {
      const src = join(assetsBase, data.videoAssetPath as string)
      if (existsSync(src)) {
        const generated = await getThumbnail(src)
        copyFileSync(generated, thumbPath)
        return
      }
    }
  }

  const assets = listAssets(projectId)
  const firstImage = assets.find((a) => a.type === 'image')
  if (firstImage && tryImage(firstImage.path)) return

  const firstVideo = assets.find((a) => a.type === 'video')
  if (firstVideo) {
    const generated = await getThumbnail(firstVideo.absolutePath)
    copyFileSync(generated, thumbPath)
  }
}

export function deleteProject(projectId: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM projects WHERE id = ?').run(projectId)

  const dir = join(projectsDir(), projectId)
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true })
  }
  logger.info('Project deleted', projectId)
}

export function getProjectAssetsPath(projectId: string): string {
  return projectAssetsDir(projectId)
}

export function saveWorkflowFile(
  projectId: string,
  filename: string,
  content: string,
): { fileName: string } {
  const dir = join(projectsDir(), projectId, 'workflows')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const fileName = filename.endsWith('.json') ? filename : `${filename}.json`
  writeFileSync(join(dir, fileName), content, 'utf-8')
  logger.info('Workflow saved', projectId, fileName)
  return { fileName }
}

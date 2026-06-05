import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { logger } from '../services/logger'

let db: Database.Database | null = null

export interface IRepository<T> {
  findById(id: string): T | null
  findAll(filter?: Partial<T>): T[]
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): string
  update(id: string, updates: Partial<T>): void
  delete(id: string): void
}

export function getDatabase(): Database.Database {
  if (db) return db

  const dataDir = join(app.getPath('userData'), 'LocalCanvas')
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }

  const dbPath = join(dataDir, 'localcanvas.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initSchema(db)
  migrateSchema(db)
  logger.info('Database initialized at', dbPath)
  return db
}

function columnExists(database: Database.Database, table: string, column: string): boolean {
  const cols = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  return cols.some((c) => c.name === column)
}

function migrateSchema(database: Database.Database): void {
  if (!columnExists(database, 'projects', 'list_order')) {
    database.exec('ALTER TABLE projects ADD COLUMN list_order INTEGER DEFAULT 0')
    const rows = database
      .prepare('SELECT id FROM projects ORDER BY updated_at DESC')
      .all() as Array<{ id: string }>
    const update = database.prepare('UPDATE projects SET list_order = ? WHERE id = ?')
    database.transaction(() => {
      rows.forEach((row, index) => update.run(index, row.id))
    })()
  }

  migrateV5Schema(database)
  migrateV6CapabilityCache(database)
  migrateV7CapabilityProbe(database)
}

function migrateV5Schema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      avatar_path TEXT,
      preferences TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local',
      cloud_user_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

    CREATE TABLE IF NOT EXISTS agent_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT,
      title TEXT,
      messages TEXT NOT NULL,
      last_plan TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dag_runs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      group_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      total_nodes INTEGER NOT NULL,
      completed_nodes INTEGER DEFAULT 0,
      current_node_id TEXT,
      snapshot TEXT NOT NULL,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dag_run_nodes (
      id TEXT PRIMARY KEY,
      dag_run_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      started_at TEXT,
      completed_at TEXT,
      error TEXT,
      output TEXT,
      FOREIGN KEY (dag_run_id) REFERENCES dag_runs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS storyboard_groups (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      frames TEXT NOT NULL,
      layout TEXT DEFAULT 'list',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_dag_runs_status ON dag_runs(status);
    CREATE INDEX IF NOT EXISTS idx_dag_runs_project ON dag_runs(project_id);
  `)

  for (const table of ['projects', 'generations', 'workflows']) {
    if (!columnExists(database, table, 'user_id')) {
      database.exec(`ALTER TABLE ${table} ADD COLUMN user_id TEXT`)
    }
  }
}

function migrateV7CapabilityProbe(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS capability_probe_cache (
      config_id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      profile_json TEXT NOT NULL,
      confidence TEXT NOT NULL,
      probed_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_capability_probe_expires ON capability_probe_cache(expires_at);
  `)
}

function migrateV6CapabilityCache(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS capability_cache (
      id TEXT PRIMARY KEY,
      provider_key TEXT NOT NULL,
      provider TEXT NOT NULL,
      model_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      profile_key TEXT NOT NULL,
      in_catalog INTEGER NOT NULL DEFAULT 0,
      confidence TEXT NOT NULL,
      synced_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      catalog_version INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_capability_cache_provider ON capability_cache(provider_key);
    CREATE INDEX IF NOT EXISTS idx_capability_cache_expires ON capability_cache(expires_at);

    CREATE TABLE IF NOT EXISTS capability_sync_meta (
      provider_key TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      last_sync_at TEXT,
      last_error TEXT,
      model_count INTEGER NOT NULL DEFAULT 0
    );
  `)
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      viewport_x REAL DEFAULT 0,
      viewport_y REAL DEFAULT 0,
      viewport_zoom REAL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL,
      position_x REAL NOT NULL,
      position_y REAL NOT NULL,
      data TEXT DEFAULT '{}',
      parent_id TEXT,
      style TEXT,
      width REAL,
      height REAL,
      PRIMARY KEY (id, project_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS edges (
      id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      source TEXT NOT NULL,
      target TEXT NOT NULL,
      source_handle TEXT,
      target_handle TEXT,
      type TEXT DEFAULT 'smoothstep',
      data TEXT DEFAULT '{}',
      PRIMARY KEY (id, project_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      label TEXT DEFAULT 'Group',
      position_x REAL NOT NULL,
      position_y REAL NOT NULL,
      width REAL DEFAULT 400,
      height REAL DEFAULT 300,
      PRIMARY KEY (id, project_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_nodes_project ON nodes(project_id);
    CREATE INDEX IF NOT EXISTS idx_edges_project ON edges(project_id);

    CREATE TABLE IF NOT EXISTS generations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      model_id TEXT NOT NULL,
      model_name TEXT,
      provider TEXT,
      prompt TEXT,
      negative_prompt TEXT,
      params TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      progress INTEGER DEFAULT 0,
      output_path TEXT,
      thumbnail_path TEXT,
      error TEXT,
      project_id TEXT,
      node_id TEXT,
      duration_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_generations_type ON generations(type);
    CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);
    CREATE INDEX IF NOT EXISTS idx_generations_created ON generations(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_generations_model ON generations(model_id);

    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      nodes TEXT NOT NULL,
      edges TEXT NOT NULL,
      thumbnail_path TEXT,
      is_preset INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_workflows_preset ON workflows(is_preset);

    CREATE TABLE IF NOT EXISTS task_queue (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      node_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      params TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      result TEXT,
      error TEXT,
      progress REAL NOT NULL DEFAULT 0,
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_task_queue_status ON task_queue(status);
  `)
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

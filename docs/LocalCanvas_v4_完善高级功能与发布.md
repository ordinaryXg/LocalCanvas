# LocalCanvas v4 — 完善 + 高级功能 + 发布

> **版本目标**：补齐所有适配器、完善历史/工作流系统、强化错误处理、完成打包发布  
> **预计周期**：2 周（10 个工作日）  
> **前置条件**：v3 验收通过  
> **生成日期**：2026-06-04

---

## 一、版本功能清单

| # | 功能模块 | 子功能 | 优先级 | 依赖 |
|---|----------|--------|--------|------|
| 1 | 适配器 | Replicate 适配器 | P1 | v2 适配器基类 |
| 2 | 适配器 | Custom HTTP 适配器 | P1 | v2 适配器基类 |
| 3 | 适配器 | 适配器热重载 | P2 | #1, #2 |
| 4 | 生成历史 | SQLite 初始化 + 表结构 | P0 | — |
| 5 | 生成历史 | 写入记录（每次生成后） | P0 | #4 |
| 6 | 生成历史 | 历史面板 UI | P0 | #5 |
| 7 | 生成历史 | 搜索/筛选 | P1 | #6 |
| 8 | 生成历史 | 一键复用（创建新节点） | P0 | #6 |
| 9 | 工作流 | 保存打组节点为工作流 | P0 | v1 打组功能 |
| 10 | 工作流 | 加载工作流到画布 | P0 | #9 |
| 11 | 工作流 | 预置工作流模板 | P1 | #10 |
| 12 | 工作流 | 导入/导出工作流 JSON | P2 | #9 |
| 13 | 错误处理 | API 超时/重试 | P0 | — |
| 14 | 错误处理 | 模型 API 离线检测 | P0 | — |
| 15 | 错误处理 | 限流自动等待 | P1 | #13 |
| 16 | 错误处理 | 异常退出恢复 | P0 | — |
| 17 | 自动保存 | 每 30s 自动保存 | P0 | v1 基础 |
| 18 | 自动保存 | 窗口失焦保存 | P0 | #17 |
| 19 | 自动保存 | 关闭前确认 | P0 | #17 |
| 20 | 大文件 | 符号链接代替复制 | P1 | — |
| 21 | 大文件 | 磁盘空间检查 | P1 | — |
| 22 | 打包 | electron-builder 配置 | P0 | — |
| 23 | 打包 | Windows NSIS 安装包 | P0 | #22 |
| 24 | 打包 | macOS DMG | P1 | #22 |
| 25 | 打包 | 代码签名 | P2 | #22 |
| 26 | 自动更新 | electron-updater 集成 | P1 | #22 |
| 27 | 文档 | README.md | P0 | — |
| 28 | 文档 | 快速入门指南 | P0 | — |
| 29 | 文档 | 模型配置指南 | P1 | — |
| 30 | 文档 | 画布工作流模板说明 | P1 | — |

---

## 二、技术架构（v4 新增）

> **⚠️ 关键修正**：ReplicateAdapter 和 CustomAdapter 与 v2 的 RemoteApi/Seedance 适配器一样，必须在 Utility Process 中执行。

```
┌──────────────────────────────────────────────────────────────────┐
│ Main Process（v4 仅做 IPC 路由 + 数据库 + 生命周期管理）           │
│                                                                   │
│ ├── IPC 转发层                                                    │
│ │   ├── replicate:* → Utility Process                             │
│ │   ├── custom:* → Utility Process                                │
│ │   ├── generation:* → SQLite 操作                                │
│ │   ├── workflow:* → SQLite 操作                                  │
│ │   └── update:* → 更新服务                                       │
│ │                                                                 │
│ ├── SQLite 数据层（IRepository<T> 统一抽象）                       │
│ │   ├── GenerationRepository (generations 表)                    │
│ │   ├── WorkflowRepository (workflows 表)                         │
│ │   ├── ProjectRepository (projects 表，v1 定义)                  │
│ │   └── TaskQueueRepository (task_queue 表，v2 定义)             │
│ │                                                                 │
│ ├── 更新服务                                                      │
│ │   ├── checkForUpdate() → { hasUpdate, version, downloadUrl }   │
│ │   └── downloadAndInstall(update)                                │
│ │                                                                 │
│ └── 日志 + 错误处理 (electron-log + ErrorHandler)                 │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Utility Process（v4 扩展适配器层）                               ││
│ │ │                                                                ││
│ │ ├── 适配器层（统一 ModelAdapter 接口，v2 定义）                   ││
│ │ │   ├── RemoteApiAdapter (v2，OpenAI 兼容 HTTP)                  ││
│ │ │   ├── SeedanceAdapter (v2，火山方舟视频)                       ││
│ │ │   ├── ReplicateAdapter (v4 新增)                              ││
│ │ │   │   ├── createPrediction() → prediction_id                  ││
│ │ │   │   ├── pollStatus(prediction_id) → status                  ││
│ │ │   │   └── downloadOutput(prediction_id) → file_path           ││
│ │ │   └── CustomAdapter (v4 新增)                                  ││
│ │ │       ├── request_template 变量替换 {{var}}                     ││
│ │ │       ├── response_mapping JSONPath 解析                        ││
│ │ │       └── 支持自定义 headers/method/auth                        ││
│ │ │                                                                ││
│ │ ├── 错误处理（统一 AdapterError，v2 定义）                       ││
│ │ │   ├── RetryManager (指数退避, max 3 次)                        ││
│ │ │   └── TaskQueue 崩溃恢复 (重启恢复 running 任务)              ││
│ │ │                                                                ││
│ │ └── 日志 (electron-log)                                         ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Renderer Process (v4 新增)                                      ││
│ │ ├── <HistoryPanel> 历史面板 (完善)                               ││
│ │ ├── <WorkflowManager> 工作流管理                                  ││
│ │ ├── <ExportWorkflowDialog> 导出工作流对话框                       ││
│ │ ├── <AboutDialog> 关于对话框 (含更新检查)                        ││
│ │ ├── 全局错误边界 (ErrorBoundary)                                  ││
│ │ └── i18n 完善 (中/英文切换，i18next)                              ││
│ └─────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

---

## 三、详细开发步骤

### Day 1-2：Replicate + Custom 适配器

#### Step 4.1.1 Replicate 适配器

**文件**：`electron/utility/services/model-adapter/replicate.ts`

```typescript
import axios from 'axios'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { parentPort } from 'worker_threads'
import { ModelAdapter, GenerateImageParams, GenerateVideoParams, GenerateTextParams, AdapterStatus } from './base'
import { AdapterError, AdapterErrorCode } from './adapter-errors'

export class ReplicateAdapter extends ModelAdapter {
  private apiToken: string
  private apiBase = 'https://api.replicate.com/v1'
  private pollInterval = 2000  // 2秒轮询

  constructor(apiToken: string) {
    super()
    this.apiToken = apiToken
  }

  async generateImage(params: GenerateImageParams): Promise<string> {
    const prediction = await this.createPrediction({
      model: params.model,
      input: {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt,
        width: params.width,
        height: params.height,
        num_outputs: params.batchSize || 1,
        num_inference_steps: params.steps || 28,
        guidance_scale: params.cfg || 7.5,
      },
    })

    const result = await this.pollUntilComplete(prediction.id)
    return this.downloadOutput(result.output[0], 'image')
  }

  async generateVideo(params: GenerateVideoParams): Promise<string> {
    const prediction = await this.createPrediction({
      model: params.model,
      input: {
        prompt: params.prompt,
        first_frame: params.firstFrame,
        last_frame: params.lastFrame,
        duration: params.duration,
      },
    })

    const result = await this.pollUntilComplete(prediction.id)
    return this.downloadOutput(result.output[0] || result.output, 'video')
  }

  async generateText(params: GenerateTextParams): Promise<string> {
    // Replicate 也支持 LLM
    const prediction = await this.createPrediction({
      model: params.model,
      input: {
        prompt: params.prompt,
        max_tokens: params.maxTokens || 4096,
        temperature: params.temperature || 0.7,
      },
    })

    const result = await this.pollUntilComplete(prediction.id)
    return Array.isArray(result.output) ? result.output.join('') : String(result.output)
  }

  async getStatus(): Promise<AdapterStatus> {
    try {
      await axios.get(`${this.apiBase}/predictions?limit=1`, {
        headers: { 'Authorization': `Token ${this.apiToken}` },
        timeout: 10000,
      })
      return { available: true, message: 'Replicate API 在线' }
    } catch (err: any) {
      throw new AdapterError(
        AdapterErrorCode.CONNECTION_FAILED,
        'Replicate API 不可达',
        { originalError: err.message }
      )
    }
  }

  cancel(_taskId: string): void {
    // Replicate 支持 cancel: POST /predictions/{id}/cancel
    // 但当前简化版不实现
  }

  // ─── 内部方法 ───

  private async createPrediction(params: any): Promise<{ id: string }> {
    try {
      const res = await axios.post(
        `${this.apiBase}/predictions`,
        {
          model: params.model,
          input: params.input,
        },
        {
          headers: {
            'Authorization': `Token ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      )
      return res.data
    } catch (err: any) {
      if (err.response?.status === 401) {
        throw new AdapterError(AdapterErrorCode.AUTH_FAILED, 'Replicate API Token 无效', { status: 401 })
      }
      if (err.response?.status === 429) {
        throw new AdapterError(AdapterErrorCode.RATE_LIMITED, 'Replicate API 限流', {
          retryAfter: err.response.headers['retry-after']
        })
      }
      throw new AdapterError(AdapterErrorCode.CONNECTION_FAILED, 'Replicate API 请求失败', {
        originalError: err.message
      })
    }
  }

  private async pollUntilComplete(predictionId: string): Promise<any> {
    while (true) {
      const res = await axios.get(`${this.apiBase}/predictions/${predictionId}`, {
        headers: { 'Authorization': `Token ${this.apiToken}` },
        timeout: 10000,
      })

      const { status, output, error } = res.data

      if (status === 'succeeded') return res.data
      if (status === 'failed' || status === 'canceled') {
        throw new AdapterError(AdapterErrorCode.GENERATION_FAILED, `Prediction ${status}: ${predictionId}`, {
          predictionId, error: error || status
        })
      }

      // 推送进度到主进程
      parentPort?.postMessage({
        type: 'adapter:progress',
        data: { taskId: predictionId, status, percentage: status === 'processing' ? 50 : 0 },
      })

      await new Promise(r => setTimeout(r, this.pollInterval))
    }
  }

  private async downloadOutput(url: string, type: 'image' | 'video'): Promise<string> {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 120000 })

    const outputDir = join(require('os').homedir(), 'LocalCanvas', 'outputs')
    await mkdir(outputDir, { recursive: true })

    const ext = type === 'image' ? 'png' : 'mp4'
    const filename = `replicate_${Date.now()}.${ext}`
    const outputPath = join(outputDir, filename)

    await writeFile(outputPath, Buffer.from(res.data))
    return outputPath
  }
}
```

---

#### Step 4.1.2 Custom HTTP 适配器

**文件**：`electron/utility/services/model-adapter/custom.ts`

```typescript
import axios from 'axios'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { parentPort } from 'worker_threads'
import { ModelAdapter, GenerateImageParams, GenerateVideoParams, GenerateTextParams, AdapterStatus } from './base'
import { AdapterError, AdapterErrorCode } from './adapter-errors'
import { JSONPath } from 'jsonpath-plus'

interface CustomConfig {
  endpoint: string
  method: string
  headers?: Record<string, string>
  request_template: Record<string, any>
  response_mapping: {
    output_url?: string    // JSONPath
    status?: string        // JSONPath
    text?: string           // JSONPath
  }
  poll_config?: {
    enabled: boolean
    endpoint?: string
    interval_ms?: number
    completion_status?: string
  }
}

export class CustomAdapter extends ModelAdapter {
  private config: CustomConfig

  constructor(config: CustomConfig) {
    super()
    this.config = config
  }

  async generateImage(params: GenerateImageParams): Promise<string> {
    const requestBody = this.buildRequestBody({
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      width: params.width,
      height: params.height,
      steps: params.steps,
      cfg: params.cfg,
      seed: params.seed,
    })

    const response = await this.sendRequest(requestBody)

    // 检查是否需要轮询
    if (this.config.poll_config?.enabled) {
      return this.pollForResult(response)
    }

    // 直接从响应提取输出 URL
    const outputUrl = this.extractValue(response, this.config.response_mapping.output_url)
    if (!outputUrl) throw new AdapterError(AdapterErrorCode.RESPONSE_PARSE_FAILED, 'No output URL in response')

    return this.downloadFile(String(outputUrl), 'image')
  }

  async generateVideo(params: GenerateVideoParams): Promise<string> {
    const requestBody = this.buildRequestBody({
      prompt: params.prompt,
      first_frame: params.firstFrame,
      last_frame: params.lastFrame,
      duration: params.duration,
      width: params.width,
      height: params.height,
    })

    const response = await this.sendRequest(requestBody)

    if (this.config.poll_config?.enabled) {
      return this.pollForResult(response)
    }

    const outputUrl = this.extractValue(response, this.config.response_mapping.output_url)
    if (!outputUrl) throw new AdapterError(AdapterErrorCode.RESPONSE_PARSE_FAILED, 'No output URL in response')

    return this.downloadFile(String(outputUrl), 'video')
  }

  async generateText(params: GenerateTextParams): Promise<string> {
    const requestBody = this.buildRequestBody({
      prompt: params.prompt,
      system_prompt: params.systemPrompt,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
    })

    const response = await this.sendRequest(requestBody)

    const text = this.extractValue(response, this.config.response_mapping.text)
    return String(text || '')
  }

  async getStatus(): Promise<AdapterStatus> {
    try {
      await axios.get(this.config.endpoint, {
        headers: this.config.headers,
        timeout: 10000,
      })
      return { available: true, message: '端点可达' }
    } catch (err: any) {
      throw new AdapterError(
        AdapterErrorCode.CONNECTION_FAILED,
        '自定义端点不可达',
        { originalError: err.message }
      )
    }
  }

  cancel(_taskId: string): void { /* 无操作 */ }

  // ─── 内部方法 ───

  private buildRequestBody(params: Record<string, any>): Record<string, any> {
    const template = JSON.parse(JSON.stringify(this.config.request_template))

    // 替换 {{variable}} 占位符
    const replaceVars = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.replace(/\{\{(\w+)\}\}/g, (_, key) => {
          return params[key] !== undefined ? String(params[key]) : `{{${key}}}`
        })
      }
      if (Array.isArray(obj)) return obj.map(replaceVars)
      if (typeof obj === 'object' && obj !== null) {
        const result: any = {}
        for (const key of Object.keys(obj)) {
          result[key] = replaceVars(obj[key])
        }
        return result
      }
      return obj
    }

    return replaceVars(template)
  }

  private async sendRequest(body: Record<string, any>): Promise<any> {
    try {
      const res = await axios({
        method: this.config.method as any,
        url: this.config.endpoint,
        data: body,
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        timeout: 120000,
      })
      return res.data
    } catch (err: any) {
      if (err.response?.status === 401) {
        throw new AdapterError(AdapterErrorCode.AUTH_FAILED, '自定义端点认证失败', { status: 401 })
      }
      if (err.response?.status === 429) {
        throw new AdapterError(AdapterErrorCode.RATE_LIMITED, '自定义端点限流', {
          retryAfter: err.response.headers['retry-after']
        })
      }
      throw new AdapterError(AdapterErrorCode.CONNECTION_FAILED, '自定义端点请求失败', {
        originalError: err.message
      })
    }
  }

  private extractValue(data: any, path?: string): any {
    if (!path) return data
    try {
      return JSONPath({ path, json: data })[0]
    } catch {
      return undefined
    }
  }

  private async pollForResult(initialResponse: any): Promise<string> {
    const pollConfig = this.config.poll_config!
    const pollInterval = pollConfig.interval_ms || 2000
    const completionStatus = pollConfig.completion_status || 'succeeded'

    let currentData = initialResponse
    let pollCount = 0
    const maxPolls = 600 // 最多轮询 20 分钟

    while (pollCount < maxPolls) {
      const status = this.extractValue(currentData, this.config.response_mapping.status)

      if (status === completionStatus) {
        const outputUrl = this.extractValue(currentData, this.config.response_mapping.output_url)
        if (!outputUrl) throw new AdapterError(AdapterErrorCode.RESPONSE_PARSE_FAILED, 'Task completed but no output URL found')
        return this.downloadFile(String(outputUrl), 'video')
      }

      if (status === 'failed' || status === 'error') {
        throw new AdapterError(AdapterErrorCode.GENERATION_FAILED, `Task failed with status: ${status}`, { status })
      }

      // 推送进度到主进程
      parentPort?.postMessage({
        type: 'adapter:progress',
        data: { status, pollCount },
      })

      await new Promise(r => setTimeout(r, pollInterval))
      pollCount++

      // 轮询新状态
      if (pollConfig.endpoint) {
        const pollUrl = pollConfig.endpoint.replace('{id}', currentData.id || '')
        const res = await axios.get(pollUrl, { headers: this.config.headers, timeout: 10000 })
        currentData = res.data
      }
    }

    throw new AdapterError(AdapterErrorCode.TIMEOUT, 'Polling timeout')
  }

  private async downloadFile(url: string, type: 'image' | 'video'): Promise<string> {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 120000 })

    const outputDir = join(require('os').homedir(), 'LocalCanvas', 'outputs')
    await mkdir(outputDir, { recursive: true })

    const ext = type === 'image' ? 'png' : 'mp4'
    const filename = `custom_${Date.now()}.${ext}`
    const outputPath = join(outputDir, filename)

    await writeFile(outputPath, Buffer.from(res.data))
    return outputPath
  }
}
```

**验收**：自定义 HTTP 端点可配置使用

---

### Day 3-4：生成历史（SQLite）

#### Step 4.2.1 数据库初始化 + IRepository 抽象

**文件**：`electron/main/services/database.ts`

> **⚠️ 架构修正**：SQLite 作为唯一数据源（MVP 修订），所有数据访问必须通过 IRepository\<T\> 抽象接口，禁止直接使用 better-sqlite3。

```typescript
import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

const DB_DIR = join(app.getPath('userData'), 'LocalCanvas')
const DB_PATH = join(DB_DIR, 'localcanvas.db')

let db: Database.Database | null = null

// ─── IRepository<T> 统一抽象 ───

export interface IRepository<T> {
  findById(id: string): T | null
  findAll(filter?: Partial<T>): T[]
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): string
  update(id: string, updates: Partial<T>): void
  delete(id: string): void
}

// ─── 数据库初始化 ───

export function getDatabase(): Database.Database {
  if (db) return db

  mkdirSync(DB_DIR, { recursive: true })
  db = new Database(DB_PATH)

  // 启用 WAL 模式
  db.pragma('journal_mode = WAL')

  // 建表
  db.exec(`
    CREATE TABLE IF NOT EXISTS generations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,               -- 'image' | 'video' | 'text'
      model_id TEXT NOT NULL,
      model_name TEXT,
      provider TEXT,
      prompt TEXT,
      negative_prompt TEXT,
      params TEXT,                      -- JSON
      status TEXT NOT NULL DEFAULT 'pending',  -- pending | running | completed | failed | cancelled
      progress INTEGER DEFAULT 0,
      output_path TEXT,
      thumbnail_path TEXT,
      error TEXT,
      project_id TEXT,
      node_id TEXT,
      duration_ms INTEGER,              -- 生成耗时
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
      nodes TEXT NOT NULL,              -- JSON
      edges TEXT NOT NULL,              -- JSON
      thumbnail_path TEXT,
      is_preset INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_workflows_preset ON workflows(is_preset);

    -- v1 定义：projects 表
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      canvas_data TEXT,                 -- JSON (节点+连线)
      thumbnail_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- v2 定义：task_queue 表
    CREATE TABLE IF NOT EXISTS task_queue (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      adapter_type TEXT NOT NULL,
      model_id TEXT,
      params TEXT NOT NULL,             -- JSON
      status TEXT NOT NULL DEFAULT 'pending',
      progress INTEGER DEFAULT 0,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      error TEXT,
      result TEXT,                      -- JSON
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_task_queue_status ON task_queue(status);
  `)

  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
```

---

#### Step 4.2.2 生成历史 CRUD（基于 IRepository\<T\>）

**文件**：`electron/main/repositories/generation-repository.ts`

> **⚠️ 架构修正**：通过 IRepository\<Generation\> 抽象访问数据，不直接使用 SQL。便于后续替换存储引擎。

```typescript
import { getDatabase, IRepository } from '../services/database'
import { v4 as uuid } from 'uuid'

// ─── Generation 实体（类型集中到 @localcanvas/types） ───

export interface Generation {
  id: string
  type: 'image' | 'video' | 'text'
  modelId: string
  modelName: string
  provider: string
  prompt: string
  negativePrompt?: string
  params?: any
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  outputPath?: string
  thumbnailPath?: string
  error?: string
  projectId?: string
  nodeId?: string
  durationMs?: number
  createdAt: string
  startedAt?: string
  completedAt?: string
  updatedAt: string
}

// ─── GenerationRepository 实现 ───

export class GenerationRepository implements IRepository<Generation> {
  findById(id: string): Generation | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM generations WHERE id = ?').get(id) as any
    return row ? this.rowToEntity(row) : null
  }

  findAll(filter?: Partial<Generation>): Generation[] {
    const db = getDatabase()
    const conditions: string[] = []
    const params: any[] = []

    if (filter?.type) { conditions.push('type = ?'); params.push(filter.type) }
    if (filter?.status) { conditions.push('status = ?'); params.push(filter.status) }
    if (filter?.modelId) { conditions.push('model_id = ?'); params.push(filter.modelId) }
    if (filter?.projectId) { conditions.push('project_id = ?'); params.push(filter.projectId) }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const rows = db.prepare(`SELECT * FROM generations ${where} ORDER BY created_at DESC`).all(...params) as any[]
    return rows.map(r => this.rowToEntity(r))
  }

  create(data: Omit<Generation, 'id' | 'createdAt' | 'updatedAt'>): string {
    const db = getDatabase()
    const id = uuid()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO generations (id, type, model_id, model_name, provider, prompt,
        negative_prompt, params, status, progress, output_path, thumbnail_path,
        error, project_id, node_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.type, data.modelId, data.modelName, data.provider,
      data.prompt, data.negativePrompt || null, JSON.stringify(data.params || {}),
      data.status, data.progress, data.outputPath || null, data.thumbnailPath || null,
      data.error || null, data.projectId || null, data.nodeId || null, now, now
    )

    return id
  }

  update(id: string, updates: Partial<Generation>): void {
    const db = getDatabase()
    const sets: string[] = []
    const values: any[] = []

    if (updates.status !== undefined) { sets.push('status = ?'); values.push(updates.status) }
    if (updates.progress !== undefined) { sets.push('progress = ?'); values.push(updates.progress) }
    if (updates.outputPath !== undefined) { sets.push('output_path = ?'); values.push(updates.outputPath) }
    if (updates.thumbnailPath !== undefined) { sets.push('thumbnail_path = ?'); values.push(updates.thumbnailPath) }
    if (updates.error !== undefined) { sets.push('error = ?'); values.push(updates.error) }
    if (updates.startedAt !== undefined) { sets.push('started_at = ?'); values.push(updates.startedAt) }
    if (updates.completedAt !== undefined) { sets.push('completed_at = ?'); values.push(updates.completedAt) }
    if (updates.durationMs !== undefined) { sets.push('duration_ms = ?'); values.push(updates.durationMs) }

    if (sets.length === 0) return

    sets.push("updated_at = datetime('now')")
    values.push(id)
    db.prepare(`UPDATE generations SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  }

  delete(id: string): void {
    const db = getDatabase()
    db.prepare('DELETE FROM generations WHERE id = ?').run(id)
  }

  // ─── 扩展查询方法 ───

  search(query: string, limit = 50, offset = 0): Generation[] {
    const db = getDatabase()
    const rows = db.prepare(`
      SELECT * FROM generations WHERE prompt LIKE ?
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(`%${query}%`, limit, offset) as any[]
    return rows.map(r => this.rowToEntity(r))
  }

  getStats(): { total: number; images: number; videos: number; texts: number; failed: number } {
    const db = getDatabase()
    const total = (db.prepare('SELECT COUNT(*) as count FROM generations').get() as any).count
    const images = (db.prepare("SELECT COUNT(*) as count FROM generations WHERE type = 'image'").get() as any).count
    const videos = (db.prepare("SELECT COUNT(*) as count FROM generations WHERE type = 'video'").get() as any).count
    const texts = (db.prepare("SELECT COUNT(*) as count FROM generations WHERE type = 'text'").get() as any).count
    const failed = (db.prepare("SELECT COUNT(*) as count FROM generations WHERE status = 'failed'").get() as any).count
    return { total, images, videos, texts, failed }
  }

  // ─── 行转实体 ───

  private rowToEntity(row: any): Generation {
    return {
      id: row.id,
      type: row.type,
      modelId: row.model_id,
      modelName: row.model_name,
      provider: row.provider,
      prompt: row.prompt,
      negativePrompt: row.negative_prompt,
      params: row.params ? JSON.parse(row.params) : {},
      status: row.status,
      progress: row.progress,
      outputPath: row.output_path,
      thumbnailPath: row.thumbnail_path,
      error: row.error,
      projectId: row.project_id,
      nodeId: row.node_id,
      durationMs: row.duration_ms,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      updatedAt: row.updated_at,
    }
  }
}
```

---

#### Step 4.2.3 历史面板 UI

**文件**：`src/components/sidebar/HistoryPanel.tsx` (完善版)

```tsx
import { useState, useEffect } from 'react'

export function HistoryPanel() {
  const [records, setRecords] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'text'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadRecords()
  }, [filter, search])

  const loadRecords = async () => {
    const list = await window.api.history.query({ type: filter === 'all' ? undefined : filter, search })
    setRecords(list)
  }

  const handleReuse = async (record: any) => {
    // 根据历史记录创建新节点
    if (record.type === 'image' || record.type === 'video') {
      // 通知画布在中心位置创建节点，复用 outputPath
      // 通过事件系统或 store 通信
    }
  }

  const typeIcons: Record<string, string> = { image: '🖼️', video: '🎥', text: '📝' }
  const statusColors: Record<string, string> = {
    completed: 'text-green-400',
    failed: 'text-red-400',
    running: 'text-yellow-400',
  }

  return (
    <div className="p-3">
      {/* 搜索 */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索提示词..."
        className="w-full bg-[#0f3460] text-white text-xs px-2 py-1.5 rounded outline-none mb-2"
      />

      {/* 筛选 */}
      <div className="flex gap-1 mb-2">
        {['all', 'image', 'video', 'text'].map(f => (
          <button key={f} onClick={() => setFilter(f as any)}
            className={`text-[10px] px-2 py-0.5 rounded ${filter === f ? 'bg-[#6366f1] text-white' : 'text-gray-500'}`}>
            {{ all: '全部', image: '🖼️', video: '🎥', text: '📝' }[f]}
          </button>
        ))}
      </div>

      {/* 记录列表 */}
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
        {records.map(r => (
          <div key={r.id} className="bg-[#0f3460] rounded p-2 hover:border-[#6366f1] border border-transparent transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{typeIcons[r.type]}</span>
                <span className="text-[10px] text-gray-300 truncate max-w-[100px]">{r.modelName}</span>
              </div>
              <span className={`text-[9px] ${statusColors[r.status] || 'text-gray-500'}`}>{r.status}</span>
            </div>
            <div className="text-[9px] text-gray-500 mt-1 truncate">{r.prompt}</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[8px] text-gray-600">
                {new Date(r.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              {r.status === 'completed' && (
                <button onClick={() => handleReuse(r)}
                  className="text-[9px] text-[#6366f1] hover:underline">
                  复用
                </button>
              )}
            </div>

            {/* 缩略图 */}
            {r.thumbnailPath && r.type === 'image' && (
              <img src={`file://${r.thumbnailPath}`} className="w-full h-12 object-cover rounded mt-1" />
            )}
          </div>
        ))}

        {records.length === 0 && (
          <div className="text-center text-gray-500 text-xs py-4">暂无记录</div>
        )}
      </div>
    </div>
  )
}
```

**验收**：历史记录可查看/搜索/筛选/复用

---

### Day 5-6：工作流模板

#### Step 4.3.1 工作流服务

**文件**：`electron/main/repositories/workflow-repository.ts`

```typescript
import { getDatabase } from './database'
import { v4 as uuid } from 'uuid'

export interface Workflow {
  id: string
  name: string
  description?: string
  nodes: any[]    // 序列化的节点数据
  edges: any[]    // 序列化的连线数据
  thumbnailPath?: string
  isPreset: boolean
  createdAt: string
  updatedAt: string
}

export function saveWorkflow(name: string, nodes: any[], edges: any[], description?: string): string {
  const db = getDatabase()
  const id = uuid()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO workflows (id, name, description, nodes, edges, is_preset, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
  `).run(id, name, description || null, JSON.stringify(nodes), JSON.stringify(edges), now, now)

  return id
}

export function loadWorkflow(workflowId: string): Workflow | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM workflows WHERE id = ?').get(workflowId) as any
  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    nodes: JSON.parse(row.nodes),
    edges: JSON.parse(row.edges),
    thumbnailPath: row.thumbnail_path,
    isPreset: row.is_preset === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function listWorkflows(presetOnly?: boolean): Array<{ id: string; name: string; description?: string; isPreset: boolean; updatedAt: string }> {
  const db = getDatabase()
  const query = presetOnly
    ? 'SELECT id, name, description, is_preset, updated_at FROM workflows WHERE is_preset = 1 ORDER BY updated_at DESC'
    : 'SELECT id, name, description, is_preset, updated_at FROM workflows ORDER BY updated_at DESC'

  const rows = db.prepare(query).all() as any[]

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isPreset: r.is_preset === 1,
    updatedAt: r.updated_at,
  }))
}

export function deleteWorkflow(workflowId: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM workflows WHERE id = ?').run(workflowId)
}

export function exportWorkflow(workflowId: string): string {
  const workflow = loadWorkflow(workflowId)
  if (!workflow) throw new Error('Workflow not found')

  return JSON.stringify({
    version: 1,
    name: workflow.name,
    description: workflow.description,
    nodes: workflow.nodes,
    edges: workflow.edges,
    exportedAt: new Date().toISOString(),
  }, null, 2)
}

export function importWorkflow(jsonStr: string): string {
  const data = JSON.parse(jsonStr)
  if (!data.nodes || !data.edges) throw new Error('Invalid workflow format')

  return saveWorkflow(data.name || 'Imported Workflow', data.nodes, data.edges, data.description)
}
```

---

#### Step 4.3.2 预置工作流

**文件**：`electron/main/repositories/preset-workflows.ts`

```typescript
import { saveWorkflow } from './workflow'

export function installPresetWorkflows(): void {
  // 1. 文生图 → 图生视频
  saveWorkflow(
    '文生图 → 图生视频',
    [
      { id: 'text-1', type: 'text', position: { x: 0, y: 100 }, data: { content: '画面描述...' } },
      { id: 'image-1', type: 'image', position: { x: 350, y: 50 }, data: {} },
      { id: 'video-1', type: 'video', position: { x: 700, y: 100 }, data: {} },
    ],
    [
      { id: 'e1', source: 'text-1', sourceHandle: 'prompt', target: 'image-1', targetHandle: 'prompt' },
      { id: 'e2', source: 'image-1', sourceHandle: 'firstFrame', target: 'video-1', targetHandle: 'firstFrame' },
    ],
    '从文本描述生成图片，再将图片转为视频片段'
  )

  // 2. 脚本 → 分镜 → 批量视频
  saveWorkflow(
    '脚本 → 分镜 → 批量视频',
    [
      { id: 'script-1', type: 'script', position: { x: 0, y: 100 }, data: {} },
    ],
    [],
    '输入故事梗概，自动生成分镜脚本，批量生成图片和视频'
  )

  // 3. 首尾帧视频生成
  saveWorkflow(
    '首尾帧视频生成',
    [
      { id: 'text-start', type: 'text', position: { x: 0, y: 0 }, data: { content: '起始画面描述' } },
      { id: 'text-end', type: 'text', position: { x: 0, y: 200 }, data: { content: '结束画面描述' } },
      { id: 'image-start', type: 'image', position: { x: 350, y: 0 }, data: {} },
      { id: 'image-end', type: 'image', position: { x: 350, y: 200 }, data: {} },
      { id: 'video-1', type: 'video', position: { x: 700, y: 100 }, data: {} },
    ],
    [
      { id: 'e1', source: 'text-start', sourceHandle: 'prompt', target: 'image-start', targetHandle: 'prompt' },
      { id: 'e2', source: 'text-end', sourceHandle: 'prompt', target: 'image-end', targetHandle: 'prompt' },
      { id: 'e3', source: 'image-start', sourceHandle: 'firstFrame', target: 'video-1', targetHandle: 'firstFrame' },
      { id: 'e4', source: 'image-end', sourceHandle: 'lastFrame', target: 'video-1', targetHandle: 'lastFrame' },
    ],
    '分别生成起始帧和结束帧图片，自动生成过渡视频'
  )

  // 4. 多片段合成
  saveWorkflow(
    '多片段合成导出',
    [
      { id: 'video-1', type: 'video', position: { x: 0, y: 0 }, data: {} },
      { id: 'video-2', type: 'video', position: { x: 0, y: 150 }, data: {} },
      { id: 'video-3', type: 'video', position: { x: 0, y: 300 }, data: {} },
      { id: 'audio-1', type: 'audio', position: { x: 350, y: 350 }, data: {} },
      { id: 'compose-1', type: 'compose', position: { x: 700, y: 150 }, data: {} },
    ],
    [
      { id: 'e1', source: 'video-1', sourceHandle: 'video', target: 'compose-1', targetHandle: 'video1' },
      { id: 'e2', source: 'video-2', sourceHandle: 'video', target: 'compose-1', targetHandle: 'video2' },
      { id: 'e3', source: 'video-3', sourceHandle: 'video', target: 'compose-1', targetHandle: 'video3' },
      { id: 'e4', source: 'audio-1', sourceHandle: 'audio', target: 'compose-1', targetHandle: 'audio' },
    ],
    '将多个视频片段拼接，可选混入背景音乐'
  )
}
```

---

### Day 7-8：错误处理 + 稳定性

#### Step 4.4.1 重试管理器

**文件**：`electron/utility/services/retry-manager.ts`

```typescript
interface RetryConfig {
  maxRetries: number
  baseDelay: number      // 基础延迟 (ms)
  maxDelay: number       // 最大延迟 (ms)
  retryableErrors: string[]  // 可重试的错误关键字
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'rate_limit', '429', '503', '502'],
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: Error) => void,
): Promise<T> {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      lastError = err as Error

      // 检查是否可重试
      const isRetryable = cfg.retryableErrors.some(keyword =>
        err.message?.includes(keyword) || err.code?.includes(keyword)
      )

      if (!isRetryable || attempt >= cfg.maxRetries) {
        throw lastError
      }

      // 指数退避
      const delay = Math.min(cfg.baseDelay * Math.pow(2, attempt), cfg.maxDelay)
      onRetry?.(attempt + 1, lastError)

      await new Promise(r => setTimeout(r, delay))
    }
  }

  throw lastError!
}
```

---

#### Step 4.4.2 模型 API 连通性检测

通过各适配器的 `getStatus()` 与设置面板的「测试连接」完成，无需独立健康检查服务。连接失败时统一映射为 `AdapterError.CONNECTION_REFUSED` / `NETWORK_ERROR`。

---

#### Step 4.4.3 崩溃恢复（SQLite 版）

**文件**：`electron/utility/services/crash-recovery.ts`

> **⚠️ 架构修正**：从基于文件的 `.tmp` 恢复改为基于 SQLite 的 `task_queue` 表恢复（与 v2 修订保持一致）。SQLite 是唯一数据源，不再有 `project.json.tmp` 文件。

```typescript
import { getDatabase } from '../../main/services/database'
import { parentPort } from 'worker_threads'

/**
 * 检测并恢复崩溃时正在运行的任务
 * 从 task_queue 表中找出 status='running' 的任务，重置为 'pending' 以便重新执行
 */
export function recoverInterruptedTasks(): {
  recovered: number
  tasks: Array<{ id: string; type: string; adapterType: string }>
} {
  const db = getDatabase()

  // 查找所有 status='running' 的任务（崩溃时残留的）
  const runningTasks = db.prepare(
    "SELECT id, type, adapter_type, retry_count, max_retries FROM task_queue WHERE status = 'running'"
  ).all() as any[]

  if (runningTasks.length === 0) {
    return { recovered: 0, tasks: [] }
  }

  const recovered: Array<{ id: string; type: string; adapterType: string }> = []

  const updateStmt = db.prepare(`
    UPDATE task_queue SET status = 'pending', retry_count = retry_count + 1, error = 'Crash recovery: task was running on shutdown'
    WHERE id = ?
  `)

  // 使用事务保证原子性
  const transaction = db.transaction(() => {
    for (const task of runningTasks) {
      // 如果重试次数未超限，重置为 pending
      if (task.retry_count < task.max_retries) {
        updateStmt.run(task.id)
        recovered.push({
          id: task.id,
          type: task.type,
          adapterType: task.adapter_type,
        })
      } else {
        // 超过最大重试次数，标记为 failed
        db.prepare(
          "UPDATE task_queue SET status = 'failed', error = 'Max retries exceeded after crash recovery' WHERE id = ?"
        ).run(task.id)
      }
    }
  })

  transaction()

  // 通知主进程恢复结果
  parentPort?.postMessage({
    type: 'crash:recovery',
    data: { recovered: recovered.length, tasks: recovered },
  })

  return { recovered: recovered.length, tasks: recovered }
}
```

---

### Day 9：打包发布

#### Step 4.5.1 electron-builder 配置

**文件**：`electron-builder.yml`

```yaml
appId: com.localcanvas.app
productName: LocalCanvas
copyright: Copyright © 2026

directories:
  output: dist/release
  buildResources: resources

files:
  - dist/**/*
  - resources/**/*
  - "!node_modules/**/{test,tests,__tests__,spec}/**"
  - "!node_modules/**/*.md"
  - "!**/*.map"

win:
  target:
    - target: nsis
      arch: [x64]
  icon: resources/icon.ico
  requestedExecutionLevel: asInvoker

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  installerIcon: resources/icon.ico
  uninstallerIcon: resources/icon.ico
  installerHeaderIcon: resources/icon.ico
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: LocalCanvas

mac:
  target:
    - target: dmg
      arch: [x64, arm64]
  icon: resources/icon.icns
  category: public.app-category.productivity

dmg:
  title: LocalCanvas ${version}
  contents:
    - x: 130
      y: 220
    - x: 410
      y: 220
      type: link
      path: /Applications

publish:
  provider: github
  owner: localcanvas
  repo: localcanvas
  releaseType: release
```

---

#### Step 4.5.2 自动更新

**文件**：`electron/main/services/updater.ts`

```typescript
import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = false
  autoUpdater.checkForUpdates()

  autoUpdater.on('update-available', (info) => {
    // 通知渲染进程有新版本
    mainWindow.webContents.send('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('update:progress', {
      percentage: progress.percent,
      speed: progress.bytesPerSecond,
    })
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update:downloaded')
  })
}

export function downloadUpdate(): void {
  autoUpdater.downloadUpdate()
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}
```

---

### Day 10：文档

#### Step 4.6.1 README.md

```markdown
# LocalCanvas

🎨 本地化 AI 视频创作画布工具

## 特性

- **无限画布** — 自由缩放、平移、节点式创作
- **5 种节点** — 文本/图片/视频/音频/脚本
- **连线工作流** — 节点间数据流传递，自动化创作
- **模型可配置** — 支持 OpenAI 兼容 / Seedance / Replicate / 自定义 HTTP API
- **脚本节点** — 输入故事梗概 → AI 自动生成分镜 → 批量生成视频
- **视频合成** — 多片段拼接、裁取、混流、导出 MP4
- **完全本地** — 无需登录，数据不离开你的电脑

## 安装

### Windows
1. 下载 `LocalCanvas-Setup-x.x.x.exe`
2. 双击运行安装程序
3. 首次启动需配置模型端点

### macOS
1. 下载 `LocalCanvas-x.x.x.dmg`
2. 拖入 Applications 文件夹
3. 首次启动需配置模型端点

## 快速开始

### 1. 配置模型
首次启动 LocalCanvas 会弹出引导界面：
- 配置火山方舟 API Key（图像 Seedream / 视频 Seedance）
- 或配置其他 OpenAI 兼容 / Replicate / 自定义 HTTP 端点
- 点击「测试连接」确认可用

### 2. 第一次生成
1. 双击画布 → 创建文本节点 → 输入画面描述
2. 从文本节点拉线到图片节点
3. 选择模型 → 点击「生成」
4. 从图片节点拉线到视频节点 → 点击「生成」

## 模型配置

编辑 `~/.localcanvas/config.yaml`，可配置：

- **火山方舟 Seedream / Seedance**：图像与视频生成（推荐）
- **OpenAI 兼容 API**：Qwen / DeepSeek / GLM 等
- **Replicate 云端模型**：无需本地 GPU
- **自定义 HTTP 端点**：任意 API 接口

详见 [模型配置指南](docs/model-config.md)

## 快捷键

| 操作 | Windows/Linux | Mac |
|------|--------------|-----|
| 新建节点 | 双击空白处 | 双击空白处 |
| 平移画布 | 空格+拖拽 | 空格+拖拽 |
| 缩放 | 滚轮 | 滚轮 |
| 撤销 | Ctrl+Z | Cmd+Z |
| 重做 | Ctrl+Shift+Z | Cmd+Shift+Z |
| 打组 | Ctrl+G | Cmd+G |
| 删除 | Delete | Delete |
| 保存 | Ctrl+S | Cmd+S |

## 技术栈

- Electron 33 + React 19 + TypeScript
- React Flow 12 (画布引擎)
- Zustand (状态管理)
- FFmpeg (视频处理)
- better-sqlite3 (生成历史)

## 开发

```bash
git clone https://github.com/localcanvas/localcanvas
cd localcanvas
npm install
npm run dev
```

## License

MIT
```

---

## 四、生成历史统计看板

**文件**：`src/components/panels/StatsPanel.tsx`

```tsx
import { useState, useEffect } from 'react'

export function StatsPanel() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    window.api.history.getStats().then(setStats)
  }, [])

  if (!stats) return null

  return (
    <div className="grid grid-cols-5 gap-2 p-3">
      <div className="bg-[#0f3460] rounded p-2 text-center">
        <div className="text-lg text-white font-bold">{stats.total}</div>
        <div className="text-[9px] text-gray-500">总生成</div>
      </div>
      <div className="bg-[#0f3460] rounded p-2 text-center">
        <div className="text-lg text-cyan-400 font-bold">{stats.images}</div>
        <div className="text-[9px] text-gray-500">图片</div>
      </div>
      <div className="bg-[#0f3460] rounded p-2 text-center">
        <div className="text-lg text-rose-400 font-bold">{stats.videos}</div>
        <div className="text-[9px] text-gray-500">视频</div>
      </div>
      <div className="bg-[#0f3460] rounded p-2 text-center">
        <div className="text-lg text-purple-400 font-bold">{stats.texts}</div>
        <div className="text-[9px] text-gray-500">文本</div>
      </div>
      <div className="bg-[#0f3460] rounded p-2 text-center">
        <div className="text-lg text-red-400 font-bold">{stats.failed}</div>
        <div className="text-[9px] text-gray-500">失败</div>
      </div>
    </div>
  )
}
```

---

## 五、错误处理矩阵

| 错误场景 | 检测方式 | 处理策略 | 用户提示 |
|----------|----------|----------|----------|
| 模型 API 离线 | 测试连接 / getStatus | 提示检查端点与 API Key + 重试 | 「无法连接到模型服务，请检查配置」 |
| API 超时 | axios timeout 60s | 指数退避重试 2 次 | 「请求超时，正在重试...」 |
| API 限流 | HTTP 429 | 自动等待 Retry-After | 「API 限流，{n}秒后重试」 |
| 生成失败 | 模型返回错误 | 显示错误 + 重试按钮 | 「生成失败：{error}」 |
| 磁盘空间不足 | 写入前检查 | 警告 + 清理建议 | 「磁盘空间不足，建议清理临时文件」 |
| 文件损坏 | JSON.parse 失败 | 从 .tmp 恢复 | 「检测到未保存的项目，已自动恢复」 |
| 网络断开 | axios Network Error | 等待网络恢复 | 「网络不可用，请检查连接」 |
| FFmpeg 不可用 | 启动时检测 | 引导下载/配置 | 「FFmpeg 未安装，视频合成功能不可用」 |

---

## 六、发布检查清单

### 打包前

- [ ] 所有测试用例通过
- [ ] 版本号更新（package.json）
- [ ] CHANGELOG.md 更新
- [ ] README.md 更新
- [ ] 无 console.log 残留
- [ ] 无 TODO/FIXME 残留

### Windows 测试

- [ ] 安装包可正常安装
- [ ] 安装后可正常启动
- [ ] 首次引导流程正常
- [ ] 模型 API 连接正常
- [ ] 图像/视频生成正常
- [ ] 视频合成/导出正常
- [ ] 项目保存/加载正常
- [ ] 卸载程序正常

### macOS 测试

- [ ] DMG 可正常挂载
- [ ] 拖入 Applications 正常
- [ ] 启动无安全警告（需签名）
- [ ] 所有功能正常
- [ ] 卸载正常

### 自动更新测试

- [ ] 检测到新版本提示
- [ ] 下载进度显示
- [ ] 下载完成提示重启
- [ ] 重启后版本更新成功

---

## 七、v4 验收标准

### 核心功能
- [ ] Replicate 适配器可正常使用（运行在 Utility Process）
- [ ] 自定义 HTTP 适配器可配置使用（运行在 Utility Process）
- [ ] 生成历史可写入/查询/搜索/筛选（通过 IRepository\<Generation\>）
- [ ] 历史记录可一键复用创建新节点
- [ ] 工作流可保存/加载/删除（通过 IRepository\<Workflow\>）
- [ ] 4 个预置工作流模板可用
- [ ] 工作流可导入/导出 JSON

### 架构要求
- [ ] ReplicateAdapter/CustomAdapter 运行在 Utility Process，不阻塞主进程
- [ ] 适配器使用 AdapterError 统一错误分类（AUTH_FAILED/RATE_LIMITED/CONNECTION_FAILED 等）
- [ ] 适配器通过 parentPort.postMessage 推送进度到主进程
- [ ] SQLite 为唯一数据源，所有数据访问通过 IRepository\<T\> 抽象
- [ ] database.ts 包含 projects/task_queue/generations/workflows 全部建表（v1-v4 统一）
- [ ] 崩溃恢复基于 SQLite task_queue 表，不依赖 .tmp 文件

### 错误处理
- [ ] API 超时自动重试（指数退避，max 3 次）
- [ ] 模型 API 离线有检测和提示
- [ ] 崩溃后 running 任务可恢复
- [ ] 各种错误场景有友好提示（错误处理矩阵覆盖）
- [ ] 自动保存（30s + 失焦 + 关闭前）

### 打包发布
- [ ] Windows 安装包可正常安装运行
- [ ] README + 快速入门指南完整
- [ ] 大文件处理不卡顿
- [ ] 日志系统正常工作（electron-log）

---

## 八、版本总览

| 版本 | 核心能力 | 周期 |
|------|----------|------|
| **v1** | 画布 + 5种节点 + 连线 + 项目存取 | 2 周 |
| **v2** | 模型配置 + 生成器 + 脚本节点 | 2.5 周 |
| **v3** | 视频合成 + 时间轴 + 项目打磨 | 2.5 周 |
| **v4** | 高级适配器 + 历史/工作流 + 发布 | 2 周 |
| **总计** | 完整可发布的本地 AI 视频创作工具 | **约 9 周**（Core 路径 7 周 + 20% 缓冲） |

---

## 九、v4 之后的演进方向

| 方向 | 说明 | 优先级 |
|------|------|--------|
| Agent 模式 | 集成 OpenClaw，一句话自动生成视频 | 高 |
| 导演台 | 3D 场景搭建 + 角色布局 | 高 |
| Slash 快捷 | 多机位九宫格、25宫格分镜等 | 中 |
| 分镜组 | 批量分镜图片管理 + 一键导出4K | 中 |
| 人声分离 | 音频人声/背景音分离 | 中 |
| 字幕擦除 | 视频字幕擦除 | 中 |
| 风格模板库 | 预置视频风格模板 | 低 |
| 社区分享 | 工作流/模板分享平台 | 低 |
| 多语言 | i18n 支持 | 低 |
| 移动端预览 | 手机端预览项目 | 低 |

---

## 十、v4 架构修订补丁

> 本章节记录基于项目评价报告（58/100，15 项问题）的 v4 修订内容，确保与其他版本（MVP/v1/v2/v3）的架构决策保持一致。

### 10.1 Utility Process 迁移说明

**问题**：v4 原版将 ReplicateAdapter、CustomAdapter、RetryManager、HealthChecker 放在 `electron/main/services/`，会阻塞主进程。

**修订**：
- 所有适配器（含 v4 新增的 Replicate/Custom）运行在 Utility Process
- 文件路径：`electron/main/services/` → `electron/utility/services/`
- 适配器通过 `parentPort.postMessage()` 推送进度到主进程
- 主进程仅做 IPC 转发 + 数据库操作

**进程分工表**：

| 组件 | 进程 | 文件路径 |
|------|------|----------|
| ReplicateAdapter | Utility | `electron/utility/services/model-adapter/replicate.ts` |
| CustomAdapter | Utility | `electron/utility/services/model-adapter/custom.ts` |
| RetryManager | Utility | `electron/utility/services/retry-manager.ts` |
| TaskQueue 崩溃恢复 | Utility | `electron/utility/services/task-queue.ts` |
| GenerationRepository | Main | `electron/main/repositories/generation-repository.ts` |
| WorkflowRepository | Main | `electron/main/repositories/workflow-repository.ts` |
| AutoUpdater | Main | `electron/main/services/updater.ts` |

### 10.2 IRepository\<T\> 统一数据抽象

**问题**：v4 原版 `generation-history.ts` 直接使用 `better-sqlite3` API，与 MVP 修订中定义的 `IRepository<T>` 抽象不一致。

**修订**：
- `database.ts` 定义 `IRepository<T>` 接口（`findById`/`findAll`/`create`/`update`/`delete`）
- `GenerationRepository` 类实现 `IRepository<Generation>`
- `WorkflowRepository` 类实现 `IRepository<Workflow>`
- 所有数据操作通过 Repository 实例，禁止直接 SQL
- `database.ts` 合并 v1-v4 全部建表语句（projects/task_queue/generations/workflows），DB 文件统一为 `localcanvas.db`

### 10.3 AdapterError 统一错误分类

**问题**：v4 原版适配器使用 `throw new Error()`，无法区分错误类型，不利于重试策略和用户提示。

**修订**：适配器统一使用 `AdapterError`（v2 定义），错误码映射：

| AdapterErrorCode | 含义 | 触发场景 | 重试策略 |
|-------------------|------|----------|----------|
| `CONNECTION_FAILED` | 连接失败 | 网络断开、DNS 解析失败 | 指数退避重试 |
| `AUTH_FAILED` | 认证失败 | API Token 无效/过期 | 不重试，提示用户检查配置 |
| `RATE_LIMITED` | 限流 | HTTP 429 | 等待 Retry-After 后重试 |
| `TIMEOUT` | 超时 | 请求超过 timeout | 指数退避重试 |
| `GENERATION_FAILED` | 生成失败 | 模型执行错误 | 重试 1 次 |
| `RESPONSE_PARSE_FAILED` | 解析失败 | JSONPath 提取为空 | 不重试，提示检查配置 |

### 10.4 崩溃恢复改为 SQLite 版

**问题**：v4 原版 `crash-recovery.ts` 基于文件系统 `.tmp` 恢复，与 SQLite 唯一数据源架构矛盾。

**修订**：
- 崩溃恢复改为从 `task_queue` 表查询 `status='running'` 的任务
- 重试次数未超限的重置为 `pending`，超限的标记为 `failed`
- 使用 SQLite 事务保证原子性
- 移入 Utility Process，通过 `parentPort` 通知主进程恢复结果

### 10.5 CI/CD 配置

**文件**：`.github/workflows/build.yml`

```yaml
name: Build & Release

on:
  push:
    tags: ['v*']
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:e2e

  build:
    needs: test
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        include:
          - os: windows-latest
            artifact: LocalCanvas-Setup-*.exe
          - os: macos-latest
            artifact: LocalCanvas-*.dmg
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run build
      - run: npm run package

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.os }}
          path: dist/release/${{ matrix.artifact }}

  release:
    needs: build
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: '**/*'
```

### 10.6 i18n 完善

**问题**：v1 定义了 i18n 基础设施（i18next），但 v4 代码中仍有硬编码中文。

**修订**：v4 新增组件必须通过 `t()` 函数引用翻译键：

| 组件 | 硬编码文本 | 翻译键 |
|------|-----------|--------|
| HistoryPanel | '搜索提示词...' | `history.searchPlaceholder` |
| HistoryPanel | '全部' | `history.filterAll` |
| HistoryPanel | '复用' | `history.reuse` |
| HistoryPanel | '暂无记录' | `history.empty` |
| StatsPanel | '总生成'/'图片'/'视频'/'文本'/'失败' | `stats.total` / `stats.images` / `stats.videos` / `stats.texts` / `stats.failed` |
| 错误提示 | 全部硬编码中文 | `error.{code}` 映射 |

**翻译文件结构**：
```
src/i18n/
  ├── index.ts          # i18next 初始化（v1 定义）
  ├── zh-CN.json        # 中文翻译
  └── en-US.json        # 英文翻译（v4 新增）
```

### 10.7 错误处理矩阵统一

**问题**：v4 原版「五、错误处理矩阵」是独立定义，与 v1/v2 的 AppError/AdapterError 框架脱节。

**修订**：错误处理矩阵与 AdapterError 体系对齐：

| 错误场景 | 错误类型 | AdapterErrorCode | 检测方式 | 处理策略 | 用户提示（i18n key） |
|----------|----------|-------------------|----------|----------|----------------------|
| 模型 API 离线 | AdapterError | `CONNECTION_REFUSED` | 测试连接 / getStatus | 提示检查端点与 API Key | `error.connection_failed` |
| API 超时 | AdapterError | `TIMEOUT` | axios timeout 60s | 指数退避重试 2 次 | `error.timeout` |
| API 限流 | AdapterError | `RATE_LIMITED` | HTTP 429 | 自动等待 Retry-After | `error.rate_limited` |
| 认证失败 | AdapterError | `AUTH_FAILED` | HTTP 401 | 不重试，提示检查配置 | `error.auth_failed` |
| 生成失败 | AdapterError | `GENERATION_FAILED` | 模型 execution_error | 重试 1 次 | `error.generation_failed` |
| 响应解析失败 | AdapterError | `RESPONSE_PARSE_FAILED` | JSONPath 提取为空 | 不重试，提示检查配置 | `error.response_parse` |
| 磁盘空间不足 | AppError | — | 写入前检查 | 警告 + 清理建议 | `error.disk_full` |
| 网络断开 | AdapterError | `CONNECTION_FAILED` | axios Network Error | 等待网络恢复 | `error.network` |
| FFmpeg 不可用 | AppError | — | 启动时检测 | 引导下载/配置 | `error.ffmpeg_missing` |

import { EventEmitter } from 'events'
import { v4 as uuid } from 'uuid'
import type Database from 'better-sqlite3'
import { AdapterError, getAdapterErrorMessage } from '../../../src/types/adapter-errors'
import {
  markTaskCancelled,
  isTaskCancelled,
  clearTaskCancelled,
  cancelledError,
} from './task-cancellation'
import type { ModelAdapter } from './model-adapter/base'
import { normalizeTextGenerateResult, type TextGenerateResult } from '../../../src/utils/textGenerateResult'

export interface GenerateTask {
  id: string
  type: 'image' | 'video' | 'text' | 'audio'
  nodeId: string
  modelId: string
  params: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  result?: string
  error?: string
  progress: number
  retryCount: number
  maxRetries: number
  createdAt: string
  startedAt?: string
  completedAt?: string
}

type TaskExecutor = (
  task: GenerateTask,
  adapter: ModelAdapter,
) => Promise<string | TextGenerateResult>

interface TaskQueueOptions {
  maxConcurrent: number
  getAdapter: (task: GenerateTask) => ModelAdapter
}

export class TaskQueue extends EventEmitter {
  private db: Database.Database
  private running = new Set<string>()
  private maxConcurrent: number
  private getAdapter: (task: GenerateTask) => ModelAdapter
  private executors: Record<GenerateTask['type'], TaskExecutor>

  constructor(db: Database.Database, options: TaskQueueOptions) {
    super()
    this.db = db
    this.maxConcurrent = options.maxConcurrent
    this.getAdapter = options.getAdapter
    this.executors = {
      image: (task, adapter) =>
        adapter.generateImage({
          ...task.params,
          nodeId: task.nodeId,
          taskId: task.id,
        } as GenerateImageParams),
      video: (task, adapter) =>
        adapter.generateVideo({
          ...task.params,
          nodeId: task.nodeId,
          taskId: task.id,
        } as GenerateVideoParams),
      text: async (task, adapter) => adapter.generateText({
          ...task.params,
          nodeId: task.nodeId,
          taskId: task.id,
        } as GenerateTextParams),
      audio: (task, adapter) =>
        adapter.generateAudio({
          ...task.params,
          nodeId: task.nodeId,
          taskId: task.id,
        } as GenerateAudioParams),
    }
    this.recoverInterruptedTasks()
  }

  private recoverInterruptedTasks(): void {
    const running = this.db
      .prepare(
        "SELECT id, retry_count, max_retries FROM task_queue WHERE status = 'running'",
      )
      .all() as Array<{ id: string; retry_count: number; max_retries: number }>

    for (const task of running) {
      if (task.retry_count + 1 >= task.max_retries) {
        this.db
          .prepare(
            "UPDATE task_queue SET status = 'failed', error = 'Max retries exceeded after crash recovery' WHERE id = ?",
          )
          .run(task.id)
      } else {
        this.db
          .prepare(
            "UPDATE task_queue SET status = 'pending', retry_count = retry_count + 1, error = 'Crash recovery: task was running on shutdown' WHERE id = ?",
          )
          .run(task.id)
      }
    }

    if (running.length > 0) {
      this.emit('log', `Recovered ${running.length} interrupted tasks`)
    }
    void this.process()
  }

  enqueue(
    task: Omit<GenerateTask, 'status' | 'progress' | 'retryCount' | 'maxRetries' | 'createdAt'>,
  ): string {
    const fullTask: GenerateTask = {
      ...task,
      status: 'pending',
      progress: 0,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
    }

    this.db
      .prepare(
        `INSERT INTO task_queue (id, type, node_id, model_id, params, status, progress)
         VALUES (?, ?, ?, ?, ?, 'pending', 0)`,
      )
      .run(
        fullTask.id,
        fullTask.type,
        fullTask.nodeId,
        fullTask.modelId,
        JSON.stringify(fullTask.params),
      )

    this.emit('task:enqueued', fullTask)
    void this.process()
    return fullTask.id
  }

  cancel(taskId: string): void {
    markTaskCancelled(taskId)
    const row = this.db
      .prepare('SELECT node_id FROM task_queue WHERE id = ?')
      .get(taskId) as { node_id: string } | undefined

    this.db.prepare("UPDATE task_queue SET status = 'cancelled' WHERE id = ?").run(taskId)
    this.running.delete(taskId)

    if (row) {
      this.emit('task:fail', { taskId, nodeId: row.node_id, error: '任务已取消' })
    }
    this.emit('task:cancelled', { taskId })
    void this.process()
  }

  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, max)
    void this.process()
  }

  private rowToTask(row: Record<string, unknown>): GenerateTask {
    return {
      id: row.id as string,
      type: row.type as GenerateTask['type'],
      nodeId: row.node_id as string,
      modelId: row.model_id as string,
      params: JSON.parse(row.params as string) as Record<string, unknown>,
      status: row.status as GenerateTask['status'],
      result: row.result as string | undefined,
      error: row.error as string | undefined,
      progress: row.progress as number,
      retryCount: row.retry_count as number,
      maxRetries: row.max_retries as number,
      createdAt: row.created_at as string,
      startedAt: row.started_at as string | undefined,
      completedAt: row.completed_at as string | undefined,
    }
  }

  private async process(): Promise<void> {
    while (this.running.size < this.maxConcurrent) {
      const row = this.db
        .prepare(
          "SELECT * FROM task_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1",
        )
        .get() as Record<string, unknown> | undefined

      if (!row) break

      const task = this.rowToTask(row)
      this.running.add(task.id)
      this.db
        .prepare(
          "UPDATE task_queue SET status = 'running', started_at = datetime('now') WHERE id = ?",
        )
        .run(task.id)
      this.emit('task:start', task)

      void this.runTask(task)
    }
  }

  private async runTask(task: GenerateTask): Promise<void> {
    if (isTaskCancelled(task.id)) {
      clearTaskCancelled(task.id)
      return
    }

    try {
      const adapter = this.getAdapter(task)

      const progressHandler = (p: { nodeId?: string; percentage: number; taskId?: string }) => {
        if (p.nodeId === task.nodeId || p.taskId) {
          this.updateProgress(task.id, p.percentage, task.nodeId)
        }
      }
      const checkpointHandler = (data: { seedanceArkTaskId?: string }) => {
        if (!data.seedanceArkTaskId) return
        const merged = { ...task.params, seedanceArkTaskId: data.seedanceArkTaskId }
        task.params = merged
        this.db
          .prepare('UPDATE task_queue SET params = ? WHERE id = ?')
          .run(JSON.stringify(merged), task.id)
      }
      adapter.on('progress', progressHandler)
      adapter.on('checkpoint', checkpointHandler)

      let rawResult: unknown
      try {
        rawResult = await this.executors[task.type](task, adapter)
      } finally {
        adapter.off('progress', progressHandler)
        adapter.off('checkpoint', checkpointHandler)
      }

      if (isTaskCancelled(task.id)) {
        clearTaskCancelled(task.id)
        return
      }

      const normalized =
        task.type === 'text'
          ? normalizeTextGenerateResult(rawResult as TextGenerateResult)
          : { content: rawResult as string, reasoningContent: undefined }
      const { content: result, reasoningContent } = normalized

      this.db
        .prepare(
          `UPDATE task_queue SET status = 'completed', result = ?, progress = 100, completed_at = datetime('now')
           WHERE id = ?`,
        )
        .run(result, task.id)
      this.running.delete(task.id)
      this.emit('task:complete', {
        taskId: task.id,
        nodeId: task.nodeId,
        result,
        ...(reasoningContent ? { reasoningContent } : {}),
      })
      clearTaskCancelled(task.id)
      void this.process()
    } catch (err) {
      if (isTaskCancelled(task.id) || (err instanceof Error && err.message === '任务已取消')) {
        clearTaskCancelled(task.id)
        this.running.delete(task.id)
        void this.process()
        return
      }

      const error = getAdapterErrorMessage(err)
      const current = this.db
        .prepare('SELECT retry_count, max_retries FROM task_queue WHERE id = ?')
        .get(task.id) as { retry_count: number; max_retries: number }

      const canRetry = !(err instanceof AdapterError && !err.retryable)

      if (canRetry && current.retry_count < current.max_retries) {
        this.db
          .prepare(
            `UPDATE task_queue SET status = 'pending', error = ?, retry_count = retry_count + 1 WHERE id = ?`,
          )
          .run(error, task.id)
        this.emit('task:retry', { taskId: task.id, error })
      } else {
        this.db
          .prepare("UPDATE task_queue SET status = 'failed', error = ? WHERE id = ?")
          .run(error, task.id)
        this.emit('task:fail', { taskId: task.id, nodeId: task.nodeId, error })
      }

      this.running.delete(task.id)
      void this.process()
    }
  }

  private updateProgress(taskId: string, progress: number, nodeId: string): void {
    this.db.prepare('UPDATE task_queue SET progress = ? WHERE id = ?').run(progress, taskId)
    this.emit('task:progress', { taskId, nodeId, progress })
  }
}

export function createTaskId(): string {
  return uuid()
}

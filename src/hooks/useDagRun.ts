import { useCallback, useRef } from 'react'
import { useDagRunStore } from '../stores/dagRunStore'
import type { Node, Edge } from '@xyflow/react'
import { topologicalSort, DagCycleError } from '../utils/dag/topologicalSort'
import { computeDataFlowPatches } from '../utils/dataFlow'
import { useCanvasStore } from '../stores/canvasStore'
import { useProjectStore } from '../stores/projectStore'
import { handleError, showToast } from '../utils/ErrorHandler'
import type { DagRunNodeState, DagRunState, DagNodeStatus } from '../types/dag'
import { formatErrorMessage } from '../types/adapter-errors'
import { executeDagNode } from './dagNodeExecutor'
import { getGeneratingNodeIds, nodeHasActiveGeneration } from '../utils/canvasGenerationState'

const GENERATABLE = new Set(['image', 'video', 'text'])

function collectSubgraph(nodeIds: string[], allNodes: Node[], allEdges: Edge[]) {
  const idSet = new Set(nodeIds)
  const edges = allEdges.filter((e) => idSet.has(e.source) && idSet.has(e.target))
  const nodes = allNodes.filter((n) => idSet.has(n.id))
  return { nodes, edges }
}

function buildPredecessors(executable: string[], edges: Edge[]): Map<string, string[]> {
  const preds = new Map<string, string[]>()
  for (const id of executable) preds.set(id, [])
  for (const e of edges) {
    if (!executable.includes(e.source) || !executable.includes(e.target)) continue
    preds.get(e.target)!.push(e.source)
  }
  return preds
}

function upstreamOf(targetId: string, preds: Map<string, string[]>): Set<string> {
  const result = new Set<string>()
  const stack = [targetId]
  while (stack.length) {
    const id = stack.pop()!
    if (result.has(id)) continue
    result.add(id)
    for (const p of preds.get(id) ?? []) stack.push(p)
  }
  return result
}

type RunContext = {
  dagRunId: string
  executable: string[]
  nodes: Node[]
  edges: Edge[]
  preds: Map<string, string[]>
  status: Map<string, DagNodeStatus>
  errors: Map<string, string>
  maxConcurrent: number
  stopOnFail: boolean
  aborted: boolean
  paused: boolean
  pauseAtSceneBoundaries: boolean
  stopAtNodeIds: Set<string>
}

export function useDagRun() {
  const runState = useDagRunStore((s) => s.runState)
  const isRunning = useDagRunStore((s) => s.isRunning)
  const setRunState = useDagRunStore((s) => s.setRunState)
  const setIsRunning = useDagRunStore((s) => s.setIsRunning)
  const ctxRef = useRef<RunContext | null>(null)
  const wakeRef = useRef<(() => void) | null>(null)

  const syncRunState = useCallback((ctx: RunContext) => {
    const completed = [...ctx.status.values()].filter(
      (s) => s === 'completed' || s === 'skipped',
    ).length
    const nodeStates: DagRunNodeState[] = ctx.executable.map((nodeId) => ({
      nodeId,
      status: ctx.status.get(nodeId) ?? 'pending',
      error: ctx.errors.get(nodeId),
    }))
    let status: DagRunState['status'] = 'running'
    const anyPending = [...ctx.status.values()].some((s) => s === 'pending')
    if (ctx.paused && anyPending) status = 'paused'
    else if (ctx.aborted && !ctx.paused) status = 'cancelled'
    else if ([...ctx.status.values()].some((s) => s === 'failed')) status = 'failed'
    else if (ctx.executable.every((id) => {
      const s = ctx.status.get(id)
      return s === 'completed' || s === 'skipped'
    })) {
      status = 'completed'
    }
    setRunState((s) =>
      s
        ? {
            ...s,
            status,
            nodeStates,
            completedCount: completed,
          }
        : s,
    )
  }, [])

  const runScheduler = useCallback(
    async (ctx: RunContext) => {
      const wake = () => wakeRef.current?.()
      wakeRef.current = () => {}

      const isReady = (nodeId: string) => {
        if (ctx.status.get(nodeId) !== 'pending') return false
        return (ctx.preds.get(nodeId) ?? []).every((p) => {
          const ps = ctx.status.get(p)
          return ps === 'completed' || ps === 'skipped' || !ctx.executable.includes(p)
        })
      }

      const inFlight = new Set<Promise<void>>()

      while (!ctx.aborted && !ctx.paused) {
        const running = [...ctx.status.values()].filter((s) => s === 'running').length
        const ready = ctx.executable.filter(isReady)
        const slots = Math.max(0, ctx.maxConcurrent - running)
        const batch = ready.slice(0, slots)

        for (const nodeId of batch) {
          ctx.status.set(nodeId, 'running')
          syncRunState(ctx)
          void window.api.dag.updateNode({ dagRunId: ctx.dagRunId, nodeId, status: 'running' })
          void window.api.dag.updateRun({ dagRunId: ctx.dagRunId, currentNodeId: nodeId })

          const node = useCanvasStore.getState().nodes.find((n) => n.id === nodeId)
          if (!node) {
            ctx.status.set(nodeId, 'failed')
            ctx.errors.set(nodeId, '节点不存在')
            syncRunState(ctx)
            continue
          }

          if (nodeHasActiveGeneration(node)) {
            ctx.status.set(nodeId, 'skipped')
            syncRunState(ctx)
            void window.api.dag.updateNode({ dagRunId: ctx.dagRunId, nodeId, status: 'skipped' })
            continue
          }

          const task = (async () => {
            try {
              await executeDagNode(node, ctx.nodes, ctx.edges)
              ctx.status.set(nodeId, 'completed')
              ctx.errors.delete(nodeId)
              const completed = [...ctx.status.values()].filter(
                (s) => s === 'completed' || s === 'skipped',
              ).length
              syncRunState(ctx)
              await window.api.dag.updateNode({ dagRunId: ctx.dagRunId, nodeId, status: 'completed' })
              await window.api.dag.updateRun({
                dagRunId: ctx.dagRunId,
                completedNodes: completed,
              })

              const nodeData = node.data as Record<string, unknown>
              const shouldPauseAtScene =
                ctx.stopAtNodeIds.has(nodeId) ||
                (ctx.pauseAtSceneBoundaries && nodeData.sceneBoundaryEnd === true)
              const stillPending = ctx.executable.some((id) => ctx.status.get(id) === 'pending')
              if (shouldPauseAtScene && stillPending) {
                ctx.paused = true
                ctx.aborted = true
                await window.api.dag.updateRun({ dagRunId: ctx.dagRunId, status: 'paused' })
                const sceneId = nodeData.sceneId
                showToast(
                  typeof sceneId === 'string' && sceneId.length > 0
                    ? `场景 ${sceneId} 已完成，审阅后可在 DAG 面板继续`
                    : '场景检查点：当前场景已完成，审阅后可继续',
                  'info',
                )
              }
            } catch (err) {
              const message = formatErrorMessage(err)
              ctx.status.set(nodeId, 'failed')
              ctx.errors.set(nodeId, message)
              useCanvasStore.getState().updateNodeData(nodeId, {
                isGenerating: false,
                progress: 0,
                error: message,
              })
              syncRunState(ctx)
              await window.api.dag.updateNode({
                dagRunId: ctx.dagRunId,
                nodeId,
                status: 'failed',
                error: message,
              })
              if (ctx.stopOnFail) {
                ctx.aborted = true
                await window.api.dag.updateRun({
                  dagRunId: ctx.dagRunId,
                  status: 'failed',
                  error: message,
                })
                handleError(err, 'dagNode')
              }
            } finally {
              wake()
            }
          })()
          inFlight.add(task)
          void task.finally(() => inFlight.delete(task))
        }

        const allSettled = ctx.executable.every((id) => {
          const s = ctx.status.get(id)
          return s === 'completed' || s === 'skipped' || s === 'failed'
        })
        const anyRunning = [...ctx.status.values()].some((s) => s === 'running')
        const anyPending = [...ctx.status.values()].some((s) => s === 'pending')

        if (allSettled && !anyRunning) break
        if (!anyRunning && !anyPending && batch.length === 0) {
          await new Promise<void>((resolve) => {
            wakeRef.current = resolve
          })
          continue
        }
        if (inFlight.size > 0) {
          await Promise.race([...inFlight, new Promise<void>((r) => { wakeRef.current = r })])
        } else {
          await new Promise<void>((r) => { wakeRef.current = r })
        }
      }

      if (ctx.paused) {
        syncRunState(ctx)
        setIsRunning(false)
        return
      }

      const failed = [...ctx.status.values()].some((s) => s === 'failed')
      if (!ctx.aborted && !failed) {
        const completed = [...ctx.status.values()].filter(
          (s) => s === 'completed' || s === 'skipped',
        ).length
        await window.api.dag.updateRun({
          dagRunId: ctx.dagRunId,
          status: 'completed',
          completedNodes: completed,
        })
        syncRunState(ctx)
      } else if (!ctx.aborted && failed) {
        const failCount = ctx.executable.filter((id) => ctx.status.get(id) === 'failed').length
        const firstErr = ctx.executable
          .map((id) => ctx.errors.get(id))
          .find((e) => e && e.length > 0)
        showToast(
          firstErr
            ? `DAG 执行失败（${failCount} 个节点）：${firstErr}`
            : `DAG 执行失败，${failCount} 个节点未完成`,
          'error',
        )
        syncRunState(ctx)
      }
      setIsRunning(false)
      ctxRef.current = null
    },
    [syncRunState],
  )

  const startRun = useCallback(
    async (
      nodeIds: string[],
      options?: { untilNodeId?: string; stopAtNodeIds?: string[]; pauseAtSceneBoundaries?: boolean },
    ) => {
      const projectId = useProjectStore.getState().currentProjectId
      if (!projectId || nodeIds.length === 0) return

      if (useDagRunStore.getState().isRunning) {
        showToast('已有工作流在执行，请等待完成或暂停后再试', 'info')
        return
      }

      const { nodes: allNodes, edges: allEdges, setNodes } = useCanvasStore.getState()

      const busyIds = getGeneratingNodeIds(allNodes)
      if (busyIds.length > 0) {
        showToast('画布上有节点正在生成，请等待完成后再启动工作流', 'info')
        return
      }

      let { nodes, edges } = collectSubgraph(nodeIds, allNodes, allEdges)

      let order: string[]
      try {
        order = topologicalSort(
          nodes.map((n) => n.id),
          edges.map((e) => ({ source: e.source, target: e.target })),
        )
      } catch (err) {
        if (err instanceof DagCycleError) {
          handleError(new Error('工作流存在环路，无法执行'), 'dagCycle')
        }
        return
      }

      let executable = order.filter((id) => {
        const n = nodes.find((x) => x.id === id)
        return n && GENERATABLE.has(n.type ?? '')
      })

      if (options?.untilNodeId && executable.includes(options.untilNodeId)) {
        const preds = buildPredecessors(executable, edges)
        const allowed = upstreamOf(options.untilNodeId, preds)
        executable = executable.filter((id) => allowed.has(id))
      }

      if (executable.length === 0) {
        handleError(new Error('选区内没有可自动生成的节点'), 'dagEmpty')
        return
      }

      const pauseAtSceneBoundaries =
        options?.pauseAtSceneBoundaries ??
        executable.some((id) => {
          const n = nodes.find((x) => x.id === id)
          return (n?.data as Record<string, unknown> | undefined)?.sceneBoundaryEnd === true
        })
      const stopAtNodeIds = new Set(options?.stopAtNodeIds ?? [])

      const patches = computeDataFlowPatches(allNodes, allEdges)
      if (patches.length > 0) {
        const patched = allNodes.map((n) => {
          const p = patches.find((x) => x.nodeId === n.id)
          return p ? { ...n, data: { ...n.data, ...p.data } } : n
        })
        setNodes(patched)
        nodes = patched.filter((n) => nodeIds.includes(n.id))
      }

      const config = await window.api.config.read()
      const maxConcurrent = Math.max(1, config.settings.max_concurrent_tasks ?? 1)

      const snapshot = { nodeIds, edges }
      const { id: dagRunId } = await window.api.dag.createRun({
        projectId,
        nodeIds: executable,
        snapshot,
      })

      const preds = buildPredecessors(executable, edges)
      const status = new Map<string, DagNodeStatus>()
      const errors = new Map<string, string>()
      executable.forEach((id) => status.set(id, 'pending'))

      const ctx: RunContext = {
        dagRunId,
        executable,
        nodes,
        edges,
        preds,
        status,
        errors,
        maxConcurrent,
        stopOnFail: true,
        aborted: false,
        paused: false,
        pauseAtSceneBoundaries,
        stopAtNodeIds,
      }
      ctxRef.current = ctx

      setRunState({
        dagRunId,
        status: 'running',
        nodeStates: executable.map((nodeId) => ({ nodeId, status: 'pending' })),
        completedCount: 0,
        totalCount: executable.length,
      })
      setIsRunning(true)
      await window.api.dag.updateRun({ dagRunId, status: 'running' })

      void runScheduler(ctx)
    },
    [runScheduler],
  )

  const skipNode = useCallback(
    (nodeId: string) => {
      const ctx = ctxRef.current
      if (!ctx || ctx.status.get(nodeId) !== 'failed') return
      ctx.status.set(nodeId, 'skipped')
      ctx.errors.delete(nodeId)
      ctx.stopOnFail = false
      ctx.aborted = false
      syncRunState(ctx)
      void window.api.dag.updateNode({ dagRunId: ctx.dagRunId, nodeId, status: 'skipped' })
      wakeRef.current?.()
      if (!isRunning) {
        setIsRunning(true)
        void runScheduler(ctx)
      }
    },
    [isRunning, runScheduler, syncRunState],
  )

  const retryNode = useCallback(
    (nodeId: string) => {
      const ctx = ctxRef.current
      if (!ctx || ctx.status.get(nodeId) !== 'failed') return
      ctx.status.set(nodeId, 'pending')
      ctx.errors.delete(nodeId)
      ctx.stopOnFail = true
      ctx.aborted = false
      syncRunState(ctx)
      void window.api.dag.updateNode({ dagRunId: ctx.dagRunId, nodeId, status: 'pending' })
      wakeRef.current?.()
      if (!isRunning) {
        setIsRunning(true)
        void runScheduler(ctx)
      }
    },
    [isRunning, runScheduler, syncRunState],
  )

  const pauseRun = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return
    ctx.paused = true
    ctx.aborted = true
    syncRunState(ctx)
    setIsRunning(false)
    void window.api.dag.updateRun({ dagRunId: ctx.dagRunId, status: 'paused' })
    showToast('工作流已暂停，可在面板中继续', 'info')
  }, [syncRunState])

  const continueRun = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return
    const anyPending = [...ctx.status.values()].some((s) => s === 'pending')
    if (!anyPending) return
    ctx.paused = false
    ctx.aborted = false
    setIsRunning(true)
    syncRunState(ctx)
    void window.api.dag.updateRun({ dagRunId: ctx.dagRunId, status: 'running' })
    void runScheduler(ctx)
    showToast('继续执行工作流', 'info')
  }, [runScheduler, syncRunState])

  const dismiss = useCallback(() => {
    const ctx = ctxRef.current
    if (ctx) ctx.aborted = true
    setRunState(null)
    setIsRunning(false)
    ctxRef.current = null
  }, [])

  return { runState, isRunning, startRun, skipNode, retryNode, pauseRun, continueRun, dismiss }
}

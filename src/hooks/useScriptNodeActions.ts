import { useState, useEffect, useCallback, useRef } from 'react'
import { useCanvasStore } from '../stores/canvasStore'
import { useProjectStore } from '../stores/projectStore'
import type { ScriptRow } from '../types/node'
import { generateId, generateNodeId } from '../utils/id'
import { handleError, showToast } from '../utils/ErrorHandler'
import { importGeneratedMedia } from '../utils/generatedMedia'
import { resolveImageRefForApi } from '../utils/resolveImageRefForApi'
import {
  resolveDefaultImageModelId,
  resolveDefaultVideoModelId,
  resolveDefaultLlmModelId,
  getImageModelConfig,
} from '../utils/configResolve'
import type { BatchItemCompleteEvent, ModelProgressEvent } from '../types/ipc'

export function useScriptNodeActions(nodeId: string) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const addNode = useCanvasStore((s) => s.addNode)
  const addConnection = useCanvasStore((s) => s.addConnection)
  const currentProjectId = useProjectStore((s) => s.currentProjectId)

  const node = useCanvasStore((s) => s.nodes.find((n) => n.id === nodeId))
  const nodePosition = node?.position ?? { x: 0, y: 0 }
  const data = (node?.data ?? {}) as Record<string, unknown>

  const rows = (data.scriptRows as ScriptRow[]) || []
  const storyInput = (data.storyInput as string) || ''
  const scriptTitle = (data.scriptTitle as string) || ''

  const [generating, setGenerating] = useState<'script' | 'images' | 'videos' | null>(null)
  const [progress, setProgress] = useState(0)
  const [defaultLlm, setDefaultLlm] = useState('')
  const [defaultImageModel, setDefaultImageModel] = useState('')
  const [defaultVideoModel, setDefaultVideoModel] = useState('')

  const processedSequencesRef = useRef(new Set<number>())

  useEffect(() => {
    void window.api.config.read().then((config) => {
      setDefaultLlm(config.settings.default_llm)
      setDefaultImageModel(config.settings.default_image_model)
      setDefaultVideoModel(config.settings.default_video_model)
    })
  }, [])

  const setStoryInput = useCallback(
    (value: string) => updateNodeData(nodeId, { storyInput: value }),
    [nodeId, updateNodeData],
  )

  const addRow = useCallback(() => {
    const newRow: ScriptRow = {
      id: generateId('row'),
      sequence: rows.length + 1,
      description: '',
      prompt: '',
      duration: 5,
      camera: '静止',
    }
    updateNodeData(nodeId, { scriptRows: [...rows, newRow] })
  }, [nodeId, rows, updateNodeData])

  const updateRow = useCallback(
    (rowId: string, field: keyof ScriptRow, value: string | number) => {
      const updated = rows.map((r) => (r.id === rowId ? { ...r, [field]: value } : r))
      updateNodeData(nodeId, { scriptRows: updated })
    },
    [nodeId, rows, updateNodeData],
  )

  const removeRow = useCallback(
    (rowId: string) => {
      const filtered = rows.filter((r) => r.id !== rowId)
      const resequenced = filtered.map((r, i) => ({ ...r, sequence: i + 1 }))
      updateNodeData(nodeId, { scriptRows: resequenced })
    },
    [nodeId, rows, updateNodeData],
  )

  const attachImageNode = useCallback(
    async (sequence: number, resultPath: string) => {
      const currentData = useCanvasStore.getState().nodes.find((n) => n.id === nodeId)?.data ?? data
      const rowAssets =
        (currentData.rowAssets as Record<number, { imageNodeId?: string; videoNodeId?: string }>) ||
        {}
      if (rowAssets[sequence]?.imageNodeId) return
      if (processedSequencesRef.current.has(sequence)) return
      processedSequencesRef.current.add(sequence)

      const currentRows = (currentData.scriptRows ?? rows) as ScriptRow[]
      const row = currentRows.find((r) => r.sequence === sequence)
      if (!row) return

      const { src, assetPath, fileName } = await importGeneratedMedia(
        currentProjectId,
        'image',
        resultPath,
      )

      const imageModelId =
        defaultImageModel ||
        (await window.api.config.read().then((c) => resolveDefaultImageModelId(c) ?? ''))

      const imageNodeId = generateNodeId('image')
      const yOffset = (sequence - 1) * 180
      const pos = useCanvasStore.getState().nodes.find((n) => n.id === nodeId)?.position ?? nodePosition

      addNode({
        id: imageNodeId,
        type: 'image',
        position: { x: pos.x + 420, y: pos.y + yOffset },
        data: {
          prompt: row.prompt,
          imageSrc: src,
          ...(assetPath ? { imageAssetPath: assetPath } : {}),
          fileName,
          modelId: imageModelId,
        },
      })

      addConnection({
        source: nodeId,
        sourceHandle: 'script',
        target: imageNodeId,
        targetHandle: 'prompt',
      })

      const rowAssetsAfter = {
        ...rowAssets,
      }
      rowAssetsAfter[sequence] = { ...rowAssetsAfter[sequence], imageNodeId }
      updateNodeData(nodeId, { rowAssets: rowAssetsAfter })
    },
    [
      addConnection,
      addNode,
      currentProjectId,
      data,
      defaultImageModel,
      nodeId,
      nodePosition,
      rows,
      updateNodeData,
    ],
  )

  const attachVideoNode = useCallback(
    async (sequence: number, resultPath: string) => {
      const currentData = useCanvasStore.getState().nodes.find((n) => n.id === nodeId)?.data ?? data
      const rowAssets =
        (currentData.rowAssets as Record<number, { imageNodeId?: string; videoNodeId?: string }>) ||
        {}
      if (rowAssets[sequence]?.videoNodeId) return
      if (processedSequencesRef.current.has(sequence)) return
      processedSequencesRef.current.add(sequence)

      const currentRows = (currentData.scriptRows ?? rows) as ScriptRow[]
      const row = currentRows.find((r) => r.sequence === sequence)
      if (!row) return

      const { src, assetPath, fileName } = await importGeneratedMedia(
        currentProjectId,
        'video',
        resultPath,
      )

      const videoNodeId = generateNodeId('video')
      const yOffset = (sequence - 1) * 180
      const pos = useCanvasStore.getState().nodes.find((n) => n.id === nodeId)?.position ?? nodePosition
      const imageNodeId = rowAssets[sequence]?.imageNodeId

      addNode({
        id: videoNodeId,
        type: 'video',
        position: { x: pos.x + 840, y: pos.y + yOffset },
        data: {
          prompt: row.prompt,
          duration: row.duration,
          camera: row.camera,
          videoSrc: src,
          ...(assetPath ? { videoAssetPath: assetPath } : {}),
          fileName,
          modelId: defaultVideoModel,
        },
      })

      addConnection({
        source: nodeId,
        sourceHandle: 'script',
        target: videoNodeId,
        targetHandle: 'prompt',
      })

      if (imageNodeId) {
        addConnection({
          source: imageNodeId,
          sourceHandle: 'firstFrame',
          target: videoNodeId,
          targetHandle: 'firstFrame',
        })
      }

      const updatedAssets = { ...rowAssets }
      updatedAssets[sequence] = { ...updatedAssets[sequence], videoNodeId }
      updateNodeData(nodeId, { rowAssets: updatedAssets })
    },
    [
      addConnection,
      addNode,
      currentProjectId,
      data,
      defaultVideoModel,
      nodeId,
      nodePosition,
      rows,
      updateNodeData,
    ],
  )

  const handleGenerateScript = useCallback(async () => {
    if (!storyInput.trim()) {
      showToast('请先输入故事梗概', 'info')
      return
    }

    const config = await window.api.config.read()
    const llmId = resolveDefaultLlmModelId(config)
    if (!llmId) {
      showToast('请先在 ⚙️ 模型配置 → LLM 中添加模型，并在「设置」标签选择默认 LLM', 'error')
      return
    }

    setGenerating('script')
    setProgress(0)
    try {
      const result = await window.api.model.generateScript({
        modelId: llmId,
        storyInput,
      })
      const scriptRows: ScriptRow[] = result.rows.map((row) => ({
        id: generateId('row'),
        sequence: row.sequence,
        description: row.description,
        prompt: row.prompt,
        duration: row.duration,
        camera: row.camera,
      }))
      updateNodeData(nodeId, { scriptRows, scriptTitle: result.title })
    } catch (err) {
      handleError(err, '脚本生成')
    } finally {
      setGenerating(null)
      setProgress(0)
    }
  }, [nodeId, storyInput, updateNodeData])

  const handleBatchImages = useCallback(async () => {
    if (rows.length === 0) {
      showToast('请先生成分镜脚本', 'info')
      return
    }

    const config = await window.api.config.read()
    const imageModelId = resolveDefaultImageModelId(config)
    if (!imageModelId) {
      showToast('请先在 ⚙️ 模型配置 → 图像 中添加模型，并在「设置」标签选择默认图像模型后保存', 'error')
      return
    }

    const imageModel = getImageModelConfig(config, imageModelId)
    if (!imageModel?.api_key?.trim()) {
      showToast(`请为「${imageModel?.name ?? imageModelId}」填写 ARK API Key 并保存配置`, 'error')
      return
    }

    setDefaultImageModel(imageModelId)
    setGenerating('images')
    setProgress(0)
    processedSequencesRef.current = new Set()

    const unsubProgress = window.api.on('model:progress', (...args: unknown[]) => {
      const p = args[0] as ModelProgressEvent
      if (p.nodeId === nodeId) setProgress(p.percentage)
    })

    const unsubItem = window.api.on('model:batchItemComplete', (...args: unknown[]) => {
      const event = args[0] as BatchItemCompleteEvent
      if (event.scriptNodeId !== nodeId || event.type !== 'image') return
      void attachImageNode(event.sequence, event.result)
    })

    try {
      await window.api.model.batchGenerateImages({
        scriptNodeId: nodeId,
        modelId: imageModelId,
        tasks: rows.map((row) => ({
          sequence: row.sequence,
          prompt: row.prompt || row.description,
          width: 2560,
          height: 1440,
        })),
      })
    } catch (err) {
      handleError(err, '批量分镜图')
    } finally {
      unsubProgress()
      unsubItem()
      setGenerating(null)
      setProgress(0)
    }
  }, [attachImageNode, nodeId, rows])

  const handleBatchVideos = useCallback(async () => {
    if (rows.length === 0) {
      showToast('请先生成分镜脚本', 'info')
      return
    }

    const config = await window.api.config.read()
    const videoModelId = resolveDefaultVideoModelId(config)
    if (!videoModelId) {
      showToast('请先在 ⚙️ 模型配置 → 视频 中添加 Seedance，并在「设置」标签选择默认视频模型后保存', 'error')
      return
    }

    const rowAssetsSnapshot =
      (useCanvasStore.getState().nodes.find((n) => n.id === nodeId)?.data.rowAssets as
        | Record<number, { imageNodeId?: string }>
        | undefined) ?? (data.rowAssets as Record<number, { imageNodeId?: string }>) ?? {}
    const nodes = useCanvasStore.getState().nodes

    setGenerating('videos')
    setProgress(0)
    processedSequencesRef.current = new Set()

    const unsubProgress = window.api.on('model:progress', (...args: unknown[]) => {
      const p = args[0] as ModelProgressEvent
      if (p.nodeId === nodeId) setProgress(p.percentage)
    })

    const unsubItem = window.api.on('model:batchItemComplete', (...args: unknown[]) => {
      const event = args[0] as BatchItemCompleteEvent
      if (event.scriptNodeId !== nodeId || event.type !== 'video') return
      void attachVideoNode(event.sequence, event.result)
    })

    try {
      const tasks = await Promise.all(
        rows.map(async (row) => {
          const latestRowAssets =
            (useCanvasStore.getState().nodes.find((n) => n.id === nodeId)?.data.rowAssets as
              | Record<number, { imageNodeId?: string }>
              | undefined) ?? rowAssetsSnapshot
          const imageNodeId = latestRowAssets[row.sequence]?.imageNodeId
          const imageNode = imageNodeId ? nodes.find((n) => n.id === imageNodeId) : undefined
          const firstFrame = imageNode
            ? await resolveImageRefForApi(imageNode.data as Record<string, unknown>, currentProjectId)
            : undefined

          return {
            sequence: row.sequence,
            prompt: row.prompt || row.description,
            duration: row.duration,
            width: 1280,
            height: 720,
            camera: row.camera,
            firstFrame,
            resolution: '720p' as const,
            generateAudio: true,
          }
        }),
      )

      await window.api.model.batchGenerateVideos({
        scriptNodeId: nodeId,
        modelId: videoModelId,
        tasks,
      })
    } catch (err) {
      handleError(err, '批量视频')
    } finally {
      unsubProgress()
      unsubItem()
      setGenerating(null)
      setProgress(0)
    }
  }, [attachVideoNode, data.rowAssets, nodeId, rows])

  return {
    rows,
    storyInput,
    scriptTitle,
    generating,
    progress,
    isBusy: generating !== null,
    setStoryInput,
    addRow,
    updateRow,
    removeRow,
    handleGenerateScript,
    handleBatchImages,
    handleBatchVideos,
  }
}

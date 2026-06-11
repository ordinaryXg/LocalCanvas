import { useEffect, useRef, useState } from 'react'
import type { LLMModelConfig } from '../../types/config'
import type { TextOutputMode } from '../../types/node'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'
import { useTextEditorStore } from '../../stores/textEditorStore'
import { useTextNodeData } from '../../hooks/useTextNodeData'
import { useTextEditorSplit } from '../../hooks/useTextEditorSplit'
import { handleError, showToast } from '../../utils/ErrorHandler'
import { useModelGeneration } from '../../hooks/useModelGeneration'
import { resolveProfile } from '../../capabilities/registry'
import { getLlmGeneratorUi } from '../../capabilities/generator-ui'
import { supportsThinkingUi } from '../../capabilities/reasoning-params'
import { assertNoWarnEdgesForNode, GenerationBlockedError } from '../../capabilities/generation-guard'
import type { ThinkingPreset } from '../../types/capability'
import { collectLlmVisionImagesFromEdges } from '../../utils/collectLlmVisionImages'
import { resolveTextNodeSystemPrompt, coerceSinglePromptOutput, buildTextNodeGeneratePrompt } from '../../utils/textPromptConstraints'
import {
  isLlmVisionImageHandle,
  visionImageIndexFromHandle,
} from '../../utils/llmVisionSlots'
import { TextEditorToolbar } from './TextEditorToolbar'
import { TextEditorSplitPane } from './TextEditorSplitPane'
import { TextEditorReasoningBlock } from './TextEditorReasoningBlock'
import { TextEditorVisionStrip } from './TextEditorVisionStrip'
import { TextEditorOutputModeBar } from './TextEditorOutputModeBar'
import { TextEditorAdvancedSettings } from './TextEditorAdvancedSettings'

interface TextEditorPanelProps {
  nodeId: string
}

export function TextEditorPanel({ nodeId }: TextEditorPanelProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const textData = useTextNodeData(nodeId)
  const focusDraftTick = useTextEditorStore((s) => s.focusDraftTick)
  const draftRef = useRef<HTMLTextAreaElement>(null)
  const { splitContainerRef, splitRatio, startSplitDrag, initSplitRatio } =
    useTextEditorSplit(nodeId)

  const [systemPrompt, setSystemPrompt] = useState('')
  const [modelId, setModelId] = useState('')
  const [thinkingPreset, setThinkingPreset] = useState<ThinkingPreset>('balanced')
  const [llmModels, setLlmModels] = useState<LLMModelConfig[]>([])
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const currentProjectId = useProjectStore((s) => s.currentProjectId)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const { isGenerating, progress, run, cancel, lastReasoningContent } = useModelGeneration(
    nodeId,
    (pct) => updateNodeData(nodeId, { isGenerating: true, progress: pct }),
  )
  const [reasoningOpen, setReasoningOpen] = useState(false)

  useEffect(() => {
    if (!textData) return
    setSystemPrompt(textData.systemPrompt ?? '')
    setModelId(textData.modelId ?? '')
    setThinkingPreset(textData.thinkingPreset ?? 'balanced')
    initSplitRatio(textData.editorLayout?.splitRatio)
  }, [
    nodeId,
    textData?.systemPrompt,
    textData?.modelId,
    textData?.thinkingPreset,
    textData?.editorLayout?.splitRatio,
    textData,
    initSplitRatio,
  ])

  const activeProfile = modelId ? resolveProfile({ configId: modelId, kind: 'llm' }) : null
  const showThinking = activeProfile ? supportsThinkingUi(activeProfile) : false
  const llmUi = modelId ? getLlmGeneratorUi(modelId) : null
  const visionEdges = edges
    .filter(
      (e) =>
        e.target === nodeId &&
        e.targetHandle &&
        isLlmVisionImageHandle(e.targetHandle),
    )
    .sort(
      (a, b) =>
        visionImageIndexFromHandle(a.targetHandle!) -
        visionImageIndexFromHandle(b.targetHandle!),
    )

  useEffect(() => {
    void window.api.config.read().then((config) => {
      setLlmModels(config.llm_models)
      if (!modelId && config.settings.default_llm) {
        setModelId(config.settings.default_llm)
      }
    })
  }, [modelId])

  useEffect(() => {
    draftRef.current?.focus({ preventScroll: true })
  }, [focusDraftTick])

  if (!textData) return null

  const draft = textData.draft ?? ''
  const output = textData.output ?? ''
  const outputMode = textData.outputMode ?? 'passthrough'
  const reasoningContent =
    (textData.reasoningContent as string | undefined) ?? lastReasoningContent ?? ''
  const patch = (data: Record<string, unknown>) => updateNodeData(nodeId, data)

  const handleDraftChange = (value: string) => {
    if (outputMode === 'passthrough' && !textData.outputEdited) {
      patch({ draft: value, output: value })
      return
    }
    patch({ draft: value })
  }

  const handleOutputChange = (value: string) => {
    patch({
      output: value,
      outputEdited: true,
    })
  }

  const handleModeChange = (mode: TextOutputMode) => {
    if (mode === 'passthrough' && !textData.outputEdited) {
      patch({ outputMode: mode, output: draft })
      return
    }
    patch({ outputMode: mode })
  }

  const syncDraftToOutput = () => {
    patch({ output: draft, outputMode: 'passthrough', outputEdited: false })
    showToast('已同步草稿到输出', 'info')
  }

  const copyOutput = async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      showToast('已复制输出内容', 'info')
    } catch {
      showToast('复制失败', 'error')
    }
  }

  const handleGenerate = async () => {
    if (!modelId || !draft.trim()) return
    try {
      assertNoWarnEdgesForNode(nodeId, nodes, edges, 'text_llm')
      const images = await collectLlmVisionImagesFromEdges(
        nodeId,
        nodes,
        edges,
        currentProjectId,
      )
      const effectiveSystemPrompt = resolveTextNodeSystemPrompt(
        nodeId,
        edges.map((e) => ({
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? undefined,
          targetHandle: e.targetHandle ?? undefined,
        })),
        systemPrompt,
        new Map(nodes.map((n) => [n.id, n.type ?? ''])),
      )
      updateNodeData(nodeId, { isGenerating: true, progress: 0, error: undefined })
      const { result, reasoningContent: generatedReasoning } = await run(() =>
        window.api.model.beginGenerateText({
          modelId,
          nodeId,
          prompt: buildTextNodeGeneratePrompt(draft),
          systemPrompt: effectiveSystemPrompt,
          thinkingPreset,
          ...(images.length > 0 ? { images } : {}),
        }),
      )
      patch({
        output: coerceSinglePromptOutput(result),
        outputMode: 'generated',
        outputEdited: false,
        modelId,
        systemPrompt: effectiveSystemPrompt ?? systemPrompt,
        thinkingPreset,
        isGenerating: false,
        progress: 100,
        ...(generatedReasoning ? { reasoningContent: generatedReasoning } : {}),
      })
      if (generatedReasoning) setReasoningOpen(true)
    } catch (err) {
      updateNodeData(nodeId, { isGenerating: false, progress: 0 })
      if (err instanceof GenerationBlockedError) {
        showToast(err.message, 'error')
        return
      }
      handleError(err, 'textGenerate')
    }
  }

  return (
    <div className="space-y-3">
      <TextEditorToolbar
        hasOutput={!!output}
        isGenerating={isGenerating}
        canGenerate={!!modelId && !!draft.trim()}
        onCopyOutput={() => void copyOutput()}
        onGenerate={() => void handleGenerate()}
        onCancel={() => void cancel()}
      />

      <TextEditorSplitPane
        draftRef={draftRef}
        splitContainerRef={splitContainerRef}
        splitRatio={splitRatio}
        onSplitDragStart={startSplitDrag}
        draft={draft}
        output={output}
        outputMode={outputMode}
        onDraftChange={handleDraftChange}
        onOutputChange={handleOutputChange}
      />

      <TextEditorReasoningBlock
        content={reasoningContent}
        open={reasoningOpen}
        onToggle={() => setReasoningOpen((v) => !v)}
      />

      <TextEditorVisionStrip
        visionEdges={visionEdges}
        currentProjectId={currentProjectId}
        llmUi={llmUi}
      />

      <TextEditorOutputModeBar
        nodeId={nodeId}
        outputMode={outputMode}
        draft={draft}
        output={output}
        onModeChange={handleModeChange}
        onSyncDraftToOutput={syncDraftToOutput}
      />

      <TextEditorAdvancedSettings
        open={advancedOpen}
        onToggle={() => setAdvancedOpen((o) => !o)}
        modelId={modelId}
        llmModels={llmModels}
        showThinking={showThinking}
        thinkingPreset={thinkingPreset}
        systemPrompt={systemPrompt}
        onModelChange={(id) => {
          setModelId(id)
          patch({ modelId: id })
        }}
        onThinkingChange={(value) => {
          setThinkingPreset(value)
          patch({ thinkingPreset: value })
        }}
        onSystemPromptChange={(value) => {
          setSystemPrompt(value)
          patch({ systemPrompt: value })
        }}
      />
    </div>
  )
}

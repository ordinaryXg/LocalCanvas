import type {
  ProductionBrief,
  ProductionPlan,
  ShotSpec,
  StudioTemplateId,
} from '../types/agent'
import type { CreativeBibleEntry } from '../types/project'
import { parseBriefFromIntent } from './agentDraftStudio'
import { injectCreativeBibleIntoPrompt } from './creativeBible'
import {
  buildProductionMeta,
  shotSpecsToScriptRows,
  validateDurationBudget,
} from './shotSpecToScriptRows'
import { validateRefSheetShots } from './refSheetValidation'
import { shotHasSceneCheckpoints } from './sceneCheckpoints'
import { generateId } from './id'

export interface BuildProductionPlanParams {
  intent: string
  templateId: StudioTemplateId
  brief?: Partial<ProductionBrief>
  shots?: ShotSpec[]
  creativeBible?: CreativeBibleEntry[]
  takesPerShot?: number
}

function briefFromIntent(intent: string, patch?: Partial<ProductionBrief>): ProductionBrief {
  const draft = parseBriefFromIntent(intent)
  const title = patch?.title ?? (draft.mustInclude.slice(0, 40) || '未命名项目')
  return {
    title,
    filmType: patch?.filmType ?? draft.filmType,
    targetDurationSec: patch?.targetDurationSec ?? draft.durationSec ?? 30,
    aspectRatio: patch?.aspectRatio ?? draft.aspectRatio ?? '16:9',
    tone: patch?.tone ?? draft.tone,
    mustInclude: patch?.mustInclude ?? draft.mustInclude,
    track: 'studio',
  }
}

function splitIntentSnippets(intent: string): string[] {
  return intent
    .split(/[，,。；;]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function buildBrandSpotShots(intent: string, brief: ProductionBrief): ShotSpec[] {
  const total = brief.targetDurationSec
  const snippets = splitIntentSnippets(intent)
  const beats: Array<{ beat: string; durationSec: number; camera: string }> =
    total <= 20
      ? [
          { beat: 'HOOK', durationSec: 4, camera: 'wide' },
          { beat: 'HERO', durationSec: Math.max(5, total - 10), camera: 'medium' },
          { beat: 'CTA', durationSec: 6, camera: 'close' },
        ]
      : [
          { beat: 'HOOK', durationSec: 5, camera: 'wide' },
          { beat: 'HERO', durationSec: 8, camera: 'medium' },
          { beat: 'HERO', durationSec: 5, camera: 'close' },
          { beat: 'STORY', durationSec: 5, camera: 'medium' },
          { beat: 'CTA', durationSec: Math.max(5, total - 23), camera: 'wide' },
        ]

  let remainder = total - beats.reduce((s, b) => s + b.durationSec, 0)
  if (remainder !== 0) {
    beats[beats.length - 1].durationSec = Math.max(
      3,
      beats[beats.length - 1].durationSec + remainder,
    )
  }

  return beats.map((b, i) => ({
    sequence: i + 1,
    beat: b.beat,
    description: snippets[i] ?? `${brief.filmType} · ${b.beat}`,
    prompt: `${brief.tone}，${snippets[i] ?? brief.mustInclude}，${b.beat} 镜头`,
    durationSec: b.durationSec,
    camera: b.camera,
    productionMode: 'i2v' as const,
  }))
}

function buildNarrativeShots(intent: string, brief: ProductionBrief): ShotSpec[] {
  const total = brief.targetDurationSec
  const sceneCount = total > 180 ? 4 : total > 90 ? 3 : 2
  const shotsPerScene = total > 120 ? 3 : 2
  const count = sceneCount * shotsPerScene
  const perShot = Math.max(3, Math.floor(total / count))
  const snippets = splitIntentSnippets(intent)

  return Array.from({ length: count }, (_, i) => {
    const sceneId = `scene-${Math.floor(i / shotsPerScene) + 1}`
    const isLast = i === count - 1
    const durationSec = isLast ? Math.max(3, total - perShot * (count - 1)) : perShot
    return {
      sequence: i + 1,
      beat: 'SCENE',
      sceneId,
      description: snippets[i] ?? `${brief.filmType} 场景 ${sceneId} 镜头 ${(i % shotsPerScene) + 1}`,
      prompt: `${brief.tone}，${snippets[i] ?? brief.mustInclude}`,
      durationSec,
      camera: i % 2 === 0 ? 'medium' : 'close',
      productionMode: 'i2v' as const,
    }
  })
}

function buildProductDemoShots(intent: string, brief: ProductionBrief): ShotSpec[] {
  const snippets = splitIntentSnippets(intent)
  const features = snippets.length >= 2 ? snippets : ['产品全貌', '核心功能', '使用场景', '落版']
  const total = brief.targetDurationSec
  const heroSec = Math.min(8, Math.max(5, Math.floor(total * 0.25)))
  const rest = Math.max(3, Math.floor((total - heroSec) / Math.max(1, features.length - 1)))
  let used = 0

  return features.map((snippet, i) => {
    const isHero = i === 0
    const durationSec =
      i === features.length - 1 ? Math.max(3, total - used) : isHero ? heroSec : rest
    used += durationSec
    return {
      sequence: i + 1,
      beat: isHero ? 'HERO' : 'DETAIL',
      description: snippet,
      prompt: injectCreativeBibleIntoPrompt(
        `${brief.tone}，${snippet}，${isHero ? '产品英雄镜' : '功能特写'}`,
        undefined,
      ),
      durationSec,
      camera: isHero ? 'medium' : 'close',
      productionMode: isHero ? ('ref-sheet' as const) : ('i2v' as const),
    }
  })
}

function buildMontageShots(intent: string, brief: ProductionBrief): ShotSpec[] {
  const voLines = splitIntentSnippets(intent)
  const lines = voLines.length >= 2 ? voLines : ['开场旁白', '主体内容', '情绪升华', '结尾']
  const shots: ShotSpec[] = []
  let sequence = 1
  const perLine = Math.max(2, Math.min(3, Math.floor(brief.targetDurationSec / lines.length / 4)))

  for (const [i, line] of lines.entries()) {
    const brollCount = i === lines.length - 1 ? 1 : 2
    for (let j = 0; j < brollCount; j++) {
      shots.push({
        sequence: sequence++,
        beat: 'BROLL',
        sceneId: `vo-${i + 1}`,
        description: `${line} · B-roll ${j + 1}`,
        prompt: `${brief.tone}，${line}，空镜 B-roll`,
        durationSec: perLine,
        camera: j === 0 ? 'wide' : 'medium',
        productionMode: 't2v',
        vo: line,
      })
    }
  }

  const sum = shots.reduce((s, x) => s + x.durationSec, 0)
  if (sum !== brief.targetDurationSec && shots.length > 0) {
    const last = shots[shots.length - 1]
    last.durationSec = Math.max(3, last.durationSec + (brief.targetDurationSec - sum))
  }
  return shots
}

export function buildShotsForTemplate(
  templateId: StudioTemplateId,
  intent: string,
  brief: ProductionBrief,
  creativeBible?: CreativeBibleEntry[],
): ShotSpec[] {
  let shots: ShotSpec[]
  if (templateId === 'narrative-short') shots = buildNarrativeShots(intent, brief)
  else if (templateId === 'product-demo') shots = buildProductDemoShots(intent, brief)
  else if (templateId === 'montage-broll') shots = buildMontageShots(intent, brief)
  else shots = buildBrandSpotShots(intent, brief)

  if (creativeBible?.length) {
    shots = shots.map((s) => ({
      ...s,
      prompt: injectCreativeBibleIntoPrompt(s.prompt, creativeBible),
    }))
  }
  return shots
}

function buildComposeClipSlots(shotCount: number) {
  const n = Math.min(shotCount, 6)
  return Array.from({ length: n }, (_, i) => ({
    id: generateId('clip'),
    name: `video${i + 1}`,
    duration: 0,
  }))
}

export function buildProductionPlan(params: BuildProductionPlanParams): ProductionPlan {
  const brief = briefFromIntent(params.intent, params.brief)
  const shots =
    params.shots ??
    buildShotsForTemplate(params.templateId, params.intent, brief, params.creativeBible)
  const durationBudget = validateDurationBudget(shots, brief.targetDurationSec)
  const refWarnings = validateRefSheetShots(shots, false)
  const scriptRows = shotSpecsToScriptRows(shots)
  const appliedAt = new Date().toISOString()
  const productionMeta = buildProductionMeta(shots, brief, {
    templateId: params.templateId,
    at: appliedAt,
  })

  const storyInput = [
    brief.title,
    `${brief.filmType} · ${brief.targetDurationSec}s · ${brief.aspectRatio}`,
    brief.tone,
    brief.mustInclude,
  ].join('\n')

  const templateLabel =
    params.templateId === 'brand-spot-30s'
      ? '品牌广告片'
      : params.templateId === 'narrative-short'
        ? '叙事短片'
        : params.templateId === 'product-demo'
          ? '产品展示片'
          : '纪录片蒙太奇'

  const workflow = {
    version: 1 as const,
    intent: params.intent,
    summary: `${templateLabel} Studio 骨架：脚本 ${shots.length} 镜 → 分镜组 → 合成`,
    skillId: params.templateId,
    executionMode: 'checkpoint' as const,
    estimatedSteps: 4,
    checkpointAfter: ['script' as const],
    nodes: [
      {
        tempId: 'script-1',
        type: 'script' as const,
        label: '分镜脚本',
        data: {
          storyInput,
          scriptRows,
          productionMeta,
        },
      },
      {
        tempId: 'storyboard-1',
        type: 'storyboard' as const,
        label: '分镜组',
        position: { x: 400, y: 120 },
        data: {
          frames: [],
          layout: 'list',
          name: brief.title,
        },
      },
      {
        tempId: 'compose-1',
        type: 'compose' as const,
        label: '合成导出',
        position: { x: 800, y: 120 },
        data: {
          clips: buildComposeClipSlots(shots.length),
        },
      },
      {
        tempId: 'audio-1',
        type: 'audio' as const,
        label: 'BGM',
        position: { x: 800, y: 340 },
        data: { label: 'BGM' },
      },
    ],
    edges: [],
  }

  return {
    version: 1,
    intent: params.intent,
    summary:
      refWarnings.length > 0
        ? `${workflow.summary}（⚠ ${refWarnings[0]}）`
        : workflow.summary,
    templateId: params.templateId,
    track: 'studio',
    brief,
    shots,
    workflow,
    executionMode: 'checkpoint',
    checkpointAfter: ['script'],
    estimatedSteps: 4,
    durationBudget,
    expansion: 'skeleton',
    takesPerShot: params.takesPerShot ?? 1,
    sceneCheckpoints:
      params.templateId === 'narrative-short' || shotHasSceneCheckpoints(shots),
  }
}

export function isValidProductionPlan(value: unknown): value is ProductionPlan {
  if (!value || typeof value !== 'object') return false
  const p = value as ProductionPlan
  return (
    p.version === 1 &&
    p.track === 'studio' &&
    typeof p.templateId === 'string' &&
    Array.isArray(p.shots) &&
    p.shots.length > 0 &&
    p.workflow?.version === 1 &&
    Array.isArray(p.workflow.nodes)
  )
}

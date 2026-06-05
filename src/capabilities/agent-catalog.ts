import type { AppConfig } from '../types/config'
import type { ModelKind } from '../types/capability'
import { formatInputBadges, formatOutputBadges } from './profile-display'
import { listConnectedModelCandidates } from './agent-model-select'

const KIND_ORDER: ModelKind[] = ['llm', 'image', 'video', 'tts']

const KIND_LABEL: Record<ModelKind, string> = {
  llm: 'LLM',
  image: '图像',
  video: '视频',
  tts: '语音',
}

export function buildModelCatalogSection(config: AppConfig): string {
  const lines: string[] = ['## 已接入模型（选模请填 config id 到 nodes[].data.modelId）']

  for (const kind of KIND_ORDER) {
    const candidates = listConnectedModelCandidates(config, kind)
    if (candidates.length === 0) continue
    lines.push(`### ${KIND_LABEL[kind]}`)
    for (const c of candidates) {
      const ins = formatInputBadges(c.profile).join('·') || '—'
      const outs = formatOutputBadges(c.profile).join('·') || '—'
      const def = c.isDefault ? ' [默认]' : ''
      lines.push(`- ${c.configId}${def}：${c.name} | 入:${ins} 出:${outs}`)
    }
  }

  lines.push('')
  lines.push('选模规则：')
  lines.push('- 仅需文案 → 选无图输入的 LLM')
  lines.push('- 需要 vision / 图片理解 → 选支持图输入的 LLM')
  lines.push('- 图生视频首帧 → 视频模型需支持首帧')
  lines.push('- 首尾帧过渡 → 必须选支持尾帧的模型（如 seedance-2-0）')
  lines.push('- 参考图生图 → 图像模型需支持参考图')

  return lines.join('\n')
}

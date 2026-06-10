import type { ModelCapabilityProfile, Modality } from '../../types/capability'
import { useT } from '../../i18n'
import { collectAliasNotes } from '../../capabilities/profile-display'

interface ModelCapabilityBadgesProps {
  profile: ModelCapabilityProfile
  compact?: boolean
}

function Badge({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'accent' | 'warn' }) {
  const cls =
    tone === 'accent'
      ? 'bg-accent/15 text-accent'
      : tone === 'warn'
        ? 'bg-amber-500/15 text-amber-200'
        : 'bg-bg-secondary text-text-muted'
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] ${cls}`}>
      {children}
    </span>
  )
}

export function ModelCapabilityBadges({ profile, compact }: ModelCapabilityBadgesProps) {
  const t = useT()

  const modalityLabel = (modality: Modality) => t(`capability.modality.${modality}`)

  const inputs = profile.inputs.map((slot) => {
    const base = modalityLabel(slot.modality)
    if (slot.max_count > 1) return `${base}≤${slot.max_count}`
    if (slot.required) return `${base}*`
    return base
  })

  const outputs = profile.outputs.map((out) => {
    const base = modalityLabel(out.modality)
    return out.async ? `${base}(${t('capability.output.async')})` : base
  })

  const reasoning = (() => {
    const r = profile.reasoning
    if (!r || r.ui_preset === 'hidden') return null
    if (r.ui_preset === 'model_implied') return t('capability.reasoning.modelImplied')
    if (r.control_kind === 'always_reasoning') return t('capability.reasoning.intensity')
    return t('capability.reasoning.toggle')
  })()

  const confidence = (() => {
    if (profile.source === 'probe') return t('capability.confidence.probed')
    if (profile.confidence === 'documented' || profile.confidence === 'verified') {
      return profile.source === 'builtin'
        ? t('capability.confidence.builtin')
        : t('capability.confidence.verified')
    }
    if (profile.source === 'inferred') return t('capability.confidence.inferred')
    return t('capability.confidence.unknown')
  })()

  const aliasNotes = collectAliasNotes(profile)

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        <Badge tone="accent">
          {t('capability.inputs')} {inputs.join('·') || '—'}
        </Badge>
        <Badge tone="accent">
          {t('capability.outputs')} {outputs.join('·') || '—'}
        </Badge>
        {reasoning && <Badge>{reasoning}</Badge>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[10px] text-text-muted mr-1">{t('capability.inputs')}</span>
        {inputs.length > 0 ? inputs.map((b) => <Badge key={b}>{b}</Badge>) : <Badge>—</Badge>}
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[10px] text-text-muted mr-1">{t('capability.outputs')}</span>
        {outputs.map((b) => (
          <Badge key={b} tone="accent">
            {b}
          </Badge>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {reasoning && <Badge>{reasoning}</Badge>}
        <Badge tone={profile.confidence === 'inferred' ? 'warn' : 'neutral'}>{confidence}</Badge>
      </div>
      {aliasNotes.map((note) => (
        <p key={note} className="text-[10px] text-amber-200/90">
          ⚠ {note}
        </p>
      ))}
    </div>
  )
}

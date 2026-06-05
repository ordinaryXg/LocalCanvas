import type { ModelCapabilityProfile } from '../../types/capability'
import {
  collectAliasNotes,
  formatConfidenceBadge,
  formatInputBadges,
  formatOutputBadges,
  formatReasoningBadge,
} from '../../capabilities/profile-display'

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
  const inputs = formatInputBadges(profile)
  const outputs = formatOutputBadges(profile)
  const reasoning = formatReasoningBadge(profile)
  const confidence = formatConfidenceBadge(profile)
  const aliasNotes = collectAliasNotes(profile)

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        <Badge tone="accent">入 {inputs.join('·') || '—'}</Badge>
        <Badge tone="accent">出 {outputs.join('·') || '—'}</Badge>
        {reasoning && <Badge>{reasoning}</Badge>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[10px] text-text-muted mr-1">输入</span>
        {inputs.length > 0 ? inputs.map((b) => <Badge key={b}>{b}</Badge>) : <Badge>—</Badge>}
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[10px] text-text-muted mr-1">输出</span>
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

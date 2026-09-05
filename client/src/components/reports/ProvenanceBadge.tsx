import { Badge } from '../ui/Badge'

type ProvenanceBadgeProps = {
  label: string
  tone?: 'neutral' | 'accent' | 'success' | 'info' | 'warning'
}

export function ProvenanceBadge({ label, tone = 'neutral' }: ProvenanceBadgeProps) {
  return <Badge tone={tone}>{label}</Badge>
}

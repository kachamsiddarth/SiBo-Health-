import type { ReactNode } from 'react'

import { Badge } from '../ui/Badge'

type SourceBadgeProps = {
  children: ReactNode
}

export function SourceBadge({ children }: SourceBadgeProps) {
  return <Badge tone="info">{children}</Badge>
}

import type { ReactNode } from 'react'

export type BadgeVariant =
  | 'default'
  | 'pink'
  | 'purple'
  | 'teal'
  | 'success'
  | 'danger'
  | 'warning'
  | 'girl'
  | 'boy'
  | 'soloist'
  | 'subunit'
  | 'group'
  | 'player1'
  | 'player2'

export interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

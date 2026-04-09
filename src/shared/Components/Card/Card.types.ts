import type { HTMLAttributes, ReactNode } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children:     ReactNode
  interactive?: boolean  // hover effect + cursor pointer
  padding?:     'none' | 'sm' | 'md' | 'lg'
}

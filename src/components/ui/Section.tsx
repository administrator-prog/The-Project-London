import type { ReactNode, ElementType } from 'react'
import { cn } from '@/lib/utils'

interface SectionProps {
  children: ReactNode
  className?: string
  as?: ElementType
  /** Vertical spacing rhythm. */
  spacing?: 'sm' | 'md' | 'lg'
}

const spacings = {
  sm: 'py-14 md:py-20',
  md: 'py-20 md:py-28',
  lg: 'py-24 md:py-36',
}

export function Section({ children, className, as: Tag = 'section', spacing = 'md' }: SectionProps) {
  return <Tag className={cn(spacings[spacing], className)}>{children}</Tag>
}

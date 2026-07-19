import type { ReactNode, ElementType } from 'react'
import { cn } from '@/lib/utils'

interface ContainerProps {
  children: ReactNode
  className?: string
  as?: ElementType
  /** `wide` uses the full gutter; `narrow` caps to a reading-width column. */
  width?: 'default' | 'wide' | 'narrow'
}

const widths = {
  default: 'max-w-[100rem]',
  wide: 'max-w-none',
  narrow: 'max-w-4xl',
}

export function Container({
  children,
  className,
  as: Tag = 'div',
  width = 'default',
}: ContainerProps) {
  return (
    <Tag className={cn('mx-auto w-full px-gutter', widths[width], className)}>
      {children}
    </Tag>
  )
}

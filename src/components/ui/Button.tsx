import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'solid' | 'outline' | 'ghost' | 'light'
type Size = 'sm' | 'md' | 'lg'

interface BaseProps {
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
}

const base =
  'group relative inline-flex items-center justify-center gap-2 font-display uppercase tracking-[0.16em] font-medium transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] whitespace-nowrap select-none disabled:opacity-40 disabled:pointer-events-none'

const sizes: Record<Size, string> = {
  sm: 'text-[0.625rem] px-5 h-9',
  md: 'text-[0.6875rem] px-7 h-12',
  lg: 'text-xs px-9 h-14',
}

const variants: Record<Variant, string> = {
  solid:
    'bg-ink text-bone hover:bg-ink-soft border border-ink hover:tracking-[0.2em]',
  outline:
    'bg-transparent text-ink border border-ink/25 hover:border-ink hover:bg-ink hover:text-bone',
  light:
    'bg-bone text-ink border border-transparent hover:bg-paper hover:tracking-[0.2em]',
  ghost:
    'bg-transparent text-ink border border-transparent hover:tracking-[0.2em] px-0',
}

function classes(variant: Variant, size: Size, className?: string) {
  return cn(base, sizes[size], variants[variant], className)
}

interface ButtonProps extends BaseProps {
  type?: 'button' | 'submit'
  onClick?: () => void
  disabled?: boolean
}

export function Button({
  variant = 'solid',
  size = 'md',
  className,
  children,
  type = 'button',
  onClick,
  disabled,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes(variant, size, className)}
    >
      {children}
    </button>
  )
}

interface ButtonLinkProps extends BaseProps {
  to: string
}

export function ButtonLink({
  variant = 'solid',
  size = 'md',
  className,
  children,
  to,
}: ButtonLinkProps) {
  return (
    <Link to={to} className={classes(variant, size, className)}>
      {children}
    </Link>
  )
}

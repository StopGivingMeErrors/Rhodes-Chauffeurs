import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { Link, type To } from 'react-router-dom'
import { cn } from '@/utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-br from-velox-gold via-velox-gold to-[#a88b3a] text-velox-void shadow-[0_4px_24px_rgba(201,168,76,0.35)] hover:from-velox-gold-light hover:via-velox-gold-light hover:to-velox-gold hover:shadow-[0_6px_28px_rgba(232,201,122,0.4)] active:scale-[0.98]',
  secondary:
    'border border-white/10 bg-white/5 text-white backdrop-blur-xl hover:border-white/20 hover:bg-white/[0.08]',
  ghost: 'text-white/75 hover:bg-white/5 hover:text-white',
  danger: 'bg-red-500/20 text-red-100 border border-red-400/30 hover:bg-red-500/30',
  success:
    'border border-emerald-400/50 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_4px_20px_rgba(16,185,129,0.35)] hover:from-emerald-400 hover:to-emerald-500 hover:shadow-[0_6px_24px_rgba(52,211,153,0.4)] active:scale-[0.98]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'rounded-lg px-3 py-2 text-xs gap-1.5',
  md: 'rounded-xl px-4 py-2.5 text-sm gap-2',
  lg: 'rounded-xl px-8 py-3.5 text-base gap-2.5',
}

type ButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  /** When set, renders a `Link` styled as a button (avoids nested interactive elements). */
  to?: To
} & ButtonHTMLAttributes<HTMLButtonElement>

function ButtonSpinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-90',
        className,
      )}
      aria-hidden
    />
  )
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  disabled,
  leftIcon,
  rightIcon,
  children,
  to,
  type = 'button',
  onClick,
  ...rest
}: ButtonProps) {
  const classes = cn(
    'inline-flex items-center justify-center font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-velox-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-velox-void disabled:pointer-events-none disabled:opacity-50',
    variantClasses[variant],
    sizeClasses[size],
    className,
  )

  const content = (
    <>
      {isLoading ? <ButtonSpinner /> : null}
      {!isLoading && leftIcon}
      {children}
      {!isLoading && rightIcon}
    </>
  )

  if (to) {
    const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
      if (disabled || isLoading) {
        event.preventDefault()
        return
      }
      onClick?.(event as unknown as MouseEvent<HTMLButtonElement>)
    }

    return (
      <Link
        to={to}
        className={classes}
        aria-disabled={disabled || isLoading ? true : undefined}
        aria-busy={isLoading ? true : undefined}
        onClick={handleLinkClick}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || isLoading}
      aria-busy={isLoading ? true : undefined}
      onClick={onClick}
      {...rest}
    >
      {content}
    </button>
  )
}

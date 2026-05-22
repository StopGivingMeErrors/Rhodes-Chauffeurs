import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

type CardProps = {
  title?: string
  description?: string
  action?: ReactNode
  /** Subtle gold outer glow on hover */
  hoverGlow?: boolean
} & HTMLAttributes<HTMLDivElement>

export function Card({
  className,
  title,
  description,
  action,
  hoverGlow = false,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/40 backdrop-blur-xl transition-[box-shadow,transform,border-color] duration-300',
        hoverGlow &&
          'hover:border-velox-gold/25 hover:shadow-[0_0_40px_rgba(201,168,76,0.12),0_20px_50px_-12px_rgba(0,0,0,0.5)]',
        className,
      )}
      {...props}
    >
      {(title || description || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? (
              <h3 className="font-display text-lg font-semibold tracking-tight text-white">{title}</h3>
            ) : null}
            {description ? <p className="mt-1 text-sm text-velox-muted">{description}</p> : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

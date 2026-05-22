import type { InputHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

type InputProps = {
  label: string
  error?: string
  /** Optional leading icon (e.g. lucide-react). */
  icon?: ReactNode
} & InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, icon, id, className, ...props },
  ref,
) {
  const inputId = id ?? label.replace(/\s+/g, '-').toLowerCase()

  return (
    <label className="block w-full space-y-1.5 text-left" htmlFor={inputId}>
      <span className="text-xs font-medium uppercase tracking-wide text-velox-muted">{label}</span>
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-0.5 shadow-inner shadow-black/30 transition focus-within:border-velox-gold/50 focus-within:bg-white/[0.07] focus-within:ring-1 focus-within:ring-velox-gold/25',
          error && 'border-red-400/50 focus-within:border-red-400 focus-within:ring-red-400/30',
        )}
      >
        {icon ? (
          <span className="flex shrink-0 text-white/40 [&_svg]:h-4 [&_svg]:w-4" aria-hidden>
            {icon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'min-w-0 flex-1 border-0 bg-transparent py-2.5 text-sm text-white outline-none ring-0 placeholder:text-white/35',
            className,
          )}
          {...props}
        />
      </div>
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </label>
  )
})

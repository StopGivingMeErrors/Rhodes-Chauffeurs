import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type SwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
  'aria-label'?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type' | 'role'>

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  id,
  'aria-label': ariaLabel,
  ...rest
}: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors',
        checked ? 'border-emerald-400/40 bg-emerald-500/25' : 'border-white/15 bg-white/10',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-6',
        )}
      />
    </button>
  )
}

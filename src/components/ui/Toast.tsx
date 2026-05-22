import { X } from 'lucide-react'
import type { ToastItem } from '@/contexts/toastContext'
import { cn } from '@/utils/cn'

type ToastProps = {
  item: ToastItem
  onDismiss: () => void
}

const variantBorder: Record<ToastItem['variant'], string> = {
  success: 'border-emerald-400/35 shadow-emerald-500/10',
  error: 'border-red-400/35 shadow-red-500/10',
  info: 'border-white/15 shadow-black/40',
}

const variantDot: Record<ToastItem['variant'], string> = {
  success: 'bg-emerald-400',
  error: 'bg-red-400',
  info: 'bg-velox-gold-light',
}

export function Toast({ item, onDismiss }: ToastProps) {
  return (
    <div
      role="status"
      className={cn(
        'velox-toast-in flex items-start gap-3 rounded-2xl border bg-zinc-950/75 px-4 py-3 shadow-2xl backdrop-blur-xl',
        variantBorder[item.variant],
      )}
    >
      <span
        className={cn('mt-1 inline-block h-2 w-2 shrink-0 rounded-full', variantDot[item.variant])}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{item.title}</p>
        {item.description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-white/65">{item.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-lg p-1 text-white/45 transition hover:bg-white/10 hover:text-white"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

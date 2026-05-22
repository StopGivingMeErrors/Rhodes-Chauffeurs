import type { HTMLAttributes } from 'react'
import type { BookingStatus } from '@/types/booking'
import { cn } from '@/utils/cn'

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'gold'

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'border-white/15 bg-white/5 text-white/80',
  success: 'border-emerald-400/35 bg-emerald-500/15 text-emerald-100',
  warning: 'border-amber-400/35 bg-amber-500/15 text-amber-100',
  danger: 'border-red-400/35 bg-red-500/15 text-red-100',
  gold: 'border-velox-gold/45 bg-velox-gold/12 text-velox-gold-light',
}

/** Visual styles for each booking lifecycle state */
const bookingStatusTone: Record<BookingStatus, BadgeTone> = {
  pending: 'warning',
  confirmed: 'gold',
  assigned: 'gold',
  in_progress: 'success',
  completed: 'success',
  cancelled: 'danger',
}

const bookingStatusLabel: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  assigned: 'Assigned',
  in_progress: 'In transit',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

type BadgeProps = {
  tone?: BadgeTone
  /** When set, applies booking-status colors and default label if children omitted */
  bookingStatus?: BookingStatus
} & HTMLAttributes<HTMLSpanElement>

export function Badge({ className, tone = 'neutral', bookingStatus, children, ...props }: BadgeProps) {
  const resolvedTone = bookingStatus ? bookingStatusTone[bookingStatus] : tone
  const content = children ?? (bookingStatus ? bookingStatusLabel[bookingStatus] : null)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm',
        toneClasses[resolvedTone],
        className,
      )}
      {...props}
    >
      {content}
    </span>
  )
}

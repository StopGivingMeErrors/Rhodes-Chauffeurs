import { Check } from 'lucide-react'
import type { BookingStatus } from '@/types/booking'
import { cn } from '@/utils/cn'

const steps: { id: BookingStatus | 'start'; label: string }[] = [
  { id: 'pending', label: 'Payment' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'assigned', label: 'Chauffeur' },
  { id: 'in_progress', label: 'In transit' },
  { id: 'completed', label: 'Complete' },
]

type BookingTimelineProps = {
  status: BookingStatus
}

export function BookingTimeline({ status }: BookingTimelineProps) {
  if (status === 'cancelled') {
    return (
      <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
        This reservation was cancelled.
      </p>
    )
  }

  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === status),
  )

  return (
    <ol className="space-y-4">
      {steps.map((step, index) => {
        const complete = activeIndex > index || status === 'completed'
        const current = activeIndex === index

        return (
          <li key={step.id} className="flex items-start gap-3">
            <span
              className={cn(
                'mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold',
                complete && 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100',
                current && !complete && 'border-velox-gold/60 bg-velox-gold/15 text-velox-gold-light',
                !complete && !current && 'border-white/15 bg-white/5 text-white/45',
              )}
            >
              {complete ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <div>
              <p className="text-sm font-medium text-white">{step.label}</p>
              {current ? (
                <p className="text-xs text-velox-muted">Current stage for this reservation.</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

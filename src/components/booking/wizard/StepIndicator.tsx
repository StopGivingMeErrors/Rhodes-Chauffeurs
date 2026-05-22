import { cn } from '@/utils/cn'

const STEPS = ['Route', 'Contact', 'Pay'] as const

type StepIndicatorProps = {
  current: 1 | 2 | 3
  className?: string
}

export function StepIndicator({ current, className }: StepIndicatorProps) {
  return (
    <div className={cn('w-full', className)} role="group" aria-label="Booking progress">
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {STEPS.map((label, i) => {
          const stepNum = (i + 1) as 1 | 2 | 3
          const active = stepNum === current
          const done = stepNum < current
          return (
            <div key={label} className="flex min-w-0 flex-1 items-center">
              <div className="flex w-full flex-col items-center gap-2">
                <div className="flex w-full items-center">
                  {i > 0 ? (
                    <div
                      className={cn(
                        'h-px flex-1 rounded-full transition-colors duration-500',
                        done || active ? 'bg-velox-gold/45' : 'bg-white/10',
                      )}
                      aria-hidden
                    />
                  ) : (
                    <div className="h-px flex-1" aria-hidden />
                  )}
                  <div
                    className={cn(
                      'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tracking-wide transition-all duration-300',
                      active &&
                        'border-velox-gold/70 bg-gradient-to-br from-velox-gold/35 to-velox-gold/10 text-velox-gold-light shadow-[0_0_20px_rgba(201,168,76,0.35)]',
                      done && !active && 'border-velox-gold/35 bg-velox-gold/15 text-velox-gold-light',
                      !active && !done && 'border-white/15 bg-white/[0.04] text-white/40',
                    )}
                    aria-current={active ? 'step' : undefined}
                  >
                    {done ? '✓' : stepNum}
                  </div>
                  {i < STEPS.length - 1 ? (
                    <div
                      className={cn(
                        'h-px flex-1 rounded-full transition-colors duration-500',
                        done ? 'bg-velox-gold/45' : 'bg-white/10',
                      )}
                      aria-hidden
                    />
                  ) : (
                    <div className="h-px flex-1" aria-hidden />
                  )}
                </div>
                <span
                  className={cn(
                    'hidden truncate text-[10px] font-medium uppercase tracking-wider sm:block',
                    active ? 'text-velox-gold-light' : 'text-white/35',
                  )}
                >
                  {label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

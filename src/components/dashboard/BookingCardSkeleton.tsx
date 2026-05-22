import { cn } from '@/utils/cn'

export function BookingCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded-full bg-white/10" />
          <div className="h-5 w-40 rounded-full bg-white/15" />
          <div className="h-3 w-full max-w-xs rounded-full bg-white/10" />
        </div>
        <div className="h-6 w-20 rounded-full bg-white/10" />
      </div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div className="h-3 w-48 max-w-full rounded-full bg-white/10" />
        <div className="h-7 w-24 rounded-lg bg-velox-gold/15" />
      </div>
      <div className="mt-5 flex gap-2">
        <div className="h-9 flex-1 rounded-xl bg-white/10" />
        <div className="h-9 w-24 rounded-xl bg-white/10" />
      </div>
    </div>
  )
}

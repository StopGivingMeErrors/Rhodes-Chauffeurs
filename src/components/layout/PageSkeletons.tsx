import { cn } from '@/utils/cn'

function pulseBlock(className: string) {
  return <div className={cn('animate-pulse rounded-xl border border-white/10 bg-white/[0.06]', className)} />
}

export function LandingSkeleton() {
  return (
    <div className="min-h-dvh bg-velox-void px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        {pulseBlock('h-12 w-2/3 max-w-md')}
        {pulseBlock('h-48 w-full')}
        <div className="grid gap-4 md:grid-cols-3">
          <div key="a">{pulseBlock('h-40')}</div>
          <div key="b">{pulseBlock('h-40')}</div>
          <div key="c">{pulseBlock('h-40')}</div>
        </div>
      </div>
    </div>
  )
}

export function BookingPageSkeleton() {
  return (
    <div className="min-h-dvh bg-velox-void px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 flex-1 animate-pulse rounded-full bg-white/[0.06]" />
          ))}
        </div>
        {pulseBlock('min-h-[320px] w-full')}
      </div>
    </div>
  )
}

export function LoginPageSkeleton() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-velox-void px-4">
      {pulseBlock('h-80 w-full max-w-md')}
    </div>
  )
}

export function ConfirmationPageSkeleton() {
  return (
    <div className="min-h-dvh bg-velox-void px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-4">
        {pulseBlock('h-10 w-1/2')}
        {pulseBlock('h-64 w-full')}
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="flex min-h-dvh bg-velox-void">
      {pulseBlock('hidden w-60 shrink-0 lg:block')}
      <div className="flex-1 space-y-6 p-8">
        {pulseBlock('h-12 w-48')}
        {pulseBlock('h-40 w-full max-w-xl')}
        {pulseBlock('h-40 w-full max-w-xl')}
      </div>
    </div>
  )
}

export function AdminDashboardSkeleton() {
  return (
    <div className="flex min-h-dvh bg-velox-void">
      {pulseBlock('hidden w-60 shrink-0 lg:block')}
      <div className="flex-1 space-y-6 p-8">
        {pulseBlock('h-12 w-64')}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/[0.05]" />
          ))}
        </div>
        {pulseBlock('h-64 w-full')}
      </div>
    </div>
  )
}

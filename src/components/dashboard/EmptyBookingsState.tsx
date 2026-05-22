import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/utils/constants'

export function EmptyBookingsState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-8 py-16 text-center">
      <div className="relative mb-6 flex h-28 w-28 items-center justify-center rounded-full border border-velox-gold/20 bg-gradient-to-b from-velox-gold/15 to-transparent">
        <Sparkles className="h-12 w-12 text-velox-gold-light/90" strokeWidth={1.25} aria-hidden />
        <span className="absolute -bottom-1 rounded-full border border-white/10 bg-velox-midnight px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-velox-muted">
          Your fleet awaits
        </span>
      </div>
      <h3 className="font-display text-2xl text-white">No journeys yet</h3>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-velox-muted">
        When you reserve a chauffeured transfer, it will appear here with live status and receipt-friendly details.
      </p>
      <Button to={ROUTES.book} variant="primary" className="mt-8" rightIcon={<span aria-hidden>→</span>}>
        Book your first ride
      </Button>
      <Link className="mt-4 text-xs text-white/40 underline-offset-4 hover:text-velox-gold-light hover:underline" to={ROUTES.home}>
        Back to home
      </Link>
    </div>
  )
}

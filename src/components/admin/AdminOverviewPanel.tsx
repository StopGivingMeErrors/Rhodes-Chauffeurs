import type { ReactNode } from 'react'
import { CalendarCheck, Car, CircleDollarSign, Radio } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useAdminKpis } from '@/hooks/useAdminDashboard'
import { formatCurrencyMajor } from '@/utils/formatters'

function KpiCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: string
  sub?: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/35 backdrop-blur-xl transition hover:border-velox-gold/20 hover:shadow-[0_0_32px_rgba(201,168,76,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-velox-muted">{label}</p>
          <p className="mt-2 font-display text-3xl tracking-tight text-white">{value}</p>
          {sub ? <p className="mt-1 text-xs text-white/45">{sub}</p> : null}
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-velox-gold-light">
          {icon}
        </span>
      </div>
    </div>
  )
}

export function AdminOverviewPanel() {
  const { data, isLoading, error, refetch, isFetching } = useAdminKpis()

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card title="Δεν φορτώθηκαν τα KPI">
        <p className="text-sm text-red-200">{error instanceof Error ? error.message : 'Άγνωστο σφάλμα'}</p>
      </Card>
    )
  }

  const k = data!

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-velox-muted">Σύνολα από το Supabase για την τρέχουσα ημέρα και τον μήνα (τοπική ώρα).</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-xs font-medium uppercase tracking-wide text-velox-gold-light hover:underline disabled:opacity-50"
          disabled={isFetching}
        >
          {isFetching ? 'Ανανέωση…' : 'Ανανέωση'}
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Κρατήσεις σήμερα"
          value={String(k.todayBookings)}
          sub="Παραλαβές που προγραμματίστηκαν για σήμερα"
          icon={<CalendarCheck className="h-5 w-5" aria-hidden />}
        />
        <KpiCard
          label="Έσοδα μήνα"
          value={formatCurrencyMajor(k.revenueThisMonth, 'EUR')}
          sub="Ολοκληρωμένα δρομολόγια, παραλαβή στον μήνα"
          icon={<CircleDollarSign className="h-5 w-5" aria-hidden />}
        />
        <KpiCard
          label="Ενεργά δρομολόγια"
          value={String(k.activeRides)}
          sub="Σε εξέλιξη τώρα"
          icon={<Car className="h-5 w-5" aria-hidden />}
        />
        <KpiCard
          label="Εκκρεμείς αναθέσεις"
          value={String(k.pendingAssignments)}
          sub="Επιβεβαιωμένα, χωρίς οδηγό ακόμα"
          icon={<Radio className="h-5 w-5" aria-hidden />}
        />
      </div>
    </div>
  )
}

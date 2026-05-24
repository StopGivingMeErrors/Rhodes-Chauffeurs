import {
  differenceInMilliseconds,
  endOfDay,
  endOfWeek,
  format,
  getDaysInMonth,
  getDate,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { el } from 'date-fns/locale'
import { useEffect, useMemo, useState } from 'react'
import { useAdminKpis } from '@/hooks/useAdminDashboard'
import { cn } from '@/utils/cn'

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n))
}

function dayProgressPct(now: Date): number {
  const start = startOfDay(now)
  const end = endOfDay(now)
  const total = differenceInMilliseconds(end, start)
  if (total <= 0) {
    return 0
  }
  return clampPct((differenceInMilliseconds(now, start) / total) * 100)
}

function monthProgressPct(now: Date): number {
  const dim = getDaysInMonth(now)
  if (dim <= 0) {
    return 0
  }
  return clampPct((getDate(now) / dim) * 100)
}

function weekProgressPct(now: Date): number {
  const start = startOfWeek(now, { weekStartsOn: 1 })
  const end = endOfWeek(now, { weekStartsOn: 1 })
  const total = differenceInMilliseconds(end, start)
  if (total <= 0) {
    return 0
  }
  return clampPct((differenceInMilliseconds(now, start) / total) * 100)
}

type ProgressTrackProps = {
  label: string
  value: number
  hint?: string
  accent?: 'gold' | 'emerald' | 'sky'
}

function ProgressTrack({ label, value, hint, accent = 'gold' }: ProgressTrackProps) {
  const pct = clampPct(value)
  const fillClass =
    accent === 'emerald'
      ? 'from-emerald-400/90 to-emerald-300/70'
      : accent === 'sky'
        ? 'from-sky-400/90 to-sky-300/70'
        : 'from-velox-gold/90 to-velox-gold-light/80'

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-white/70">{Math.round(pct)}%</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.08] ring-1 ring-inset ring-white/10">
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full bg-gradient-to-r shadow-[0_0_12px_rgba(201,168,76,0.35)] transition-[width] duration-700 ease-out',
            fillClass,
          )}
          style={{ width: `${pct}%` }}
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-40"
          aria-hidden
        />
      </div>
      {hint ? <p className="text-[10px] leading-relaxed text-white/35">{hint}</p> : null}
    </div>
  )
}

/**
 * Live digital clock with operational progress tracks — shown above the bookings table.
 */
export function AdminOpsDigitalClock() {
  const [now, setNow] = useState(() => new Date())
  const [colonVisible, setColonVisible] = useState(true)
  const { data: kpis } = useAdminKpis()

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(tick)
  }, [])

  useEffect(() => {
    const blink = window.setInterval(() => setColonVisible((v) => !v), 1000)
    return () => window.clearInterval(blink)
  }, [])

  const timeParts = useMemo(() => {
    const h = format(now, 'HH')
    const m = format(now, 'mm')
    const s = format(now, 'ss')
    return { h, m, s }
  }, [now])

  const tz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')
    } catch {
      return 'Τοπική ώρα'
    }
  }, [])

  const dayPct = dayProgressPct(now)
  const monthPct = monthProgressPct(now)
  const weekPct = weekProgressPct(now)

  const todayBookings = kpis?.todayBookings ?? 0
  const activeRides = kpis?.activeRides ?? 0
  const pendingAssign = kpis?.pendingAssignments ?? 0
  const dispatchPct = clampPct(Math.min(100, todayBookings * 12.5))

  return (
    <section
      className="relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-black/40 to-black/60 p-5 shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-6"
      aria-label="Ρολόι λειτουργίας και πρόοδος ημέρας"
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_80%_50%_at_20%_0%,rgba(201,168,76,0.12),transparent_55%)]" />

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between lg:block">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-velox-gold-light/80">
              Ρολόι λειτουργίας
            </p>
            <p className="mt-1 text-xs text-white/45">{format(now, 'EEEE · MMM d', { locale: el })}</p>
          </div>

          <div
            className="mt-2 font-mono text-[clamp(2.5rem,8vw,4.25rem)] font-light leading-none tracking-tight text-white tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="text-white drop-shadow-[0_0_24px_rgba(232,201,122,0.35)]">{timeParts.h}</span>
            <span
              className={cn(
                'mx-0.5 text-velox-gold-light transition-opacity duration-300',
                colonVisible ? 'opacity-100' : 'opacity-25',
              )}
              aria-hidden
            >
              :
            </span>
            <span className="text-white">{timeParts.m}</span>
            <span
              className={cn(
                'mx-0.5 text-velox-gold-light/70 transition-opacity duration-300',
                colonVisible ? 'opacity-100' : 'opacity-25',
              )}
              aria-hidden
            >
              :
            </span>
            <span className="text-lg text-white/55 sm:text-2xl">{timeParts.s}</span>
          </div>

          <p className="mt-2 text-[11px] font-medium uppercase tracking-widest text-white/35">{tz}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ProgressTrack label="Κύκλος ημέρας" value={dayPct} hint="Ποσοστό ημέρας που πέρασε" />
          <ProgressTrack label="Κύκλος εβδομάδας" value={weekPct} hint="Δευτέρα → Κυριακή" accent="sky" />
          <ProgressTrack
            label="Κύκλος μήνα"
            value={monthPct}
            hint={format(startOfMonth(now), 'MMMM yyyy', { locale: el })}
          />
          <ProgressTrack
            label="Αναθέσεις σήμερα"
            value={dispatchPct}
            hint={`${todayBookings} παραλαβ${todayBookings === 1 ? 'ή' : 'ές'} σήμερα · ${activeRides} ενεργ${activeRides === 1 ? 'ό' : 'ά'} · ${pendingAssign} χωρίς ανάθεση`}
            accent="emerald"
          />
        </div>
      </div>
    </section>
  )
}

import { Calendar } from 'lucide-react'
import { useLayoutEffect, useMemo } from 'react'
import { Input } from '@/components/ui/Input'
import { useBookingStore } from '@/stores/bookingStore'
import {
  availablePickupTimesForDate,
  snapPickupSchedule,
  validatePickupSchedule,
} from '@/utils/bookingPickupValidation'
import { MAX_BOOKING_PASSENGERS } from '@/utils/constants'
import { toPickupIso } from '@/utils/bookingWizard'
import { PICKUP_TIME_SLOTS, todayIsoDate } from '@/utils/validators'

function snapToNearestSlot(time: string, allowed: readonly string[]): string {
  if (allowed.includes(time)) {
    return time
  }
  const parts = time.split(':').map(Number)
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  const total = h * 60 + m
  let best = allowed[0] ?? PICKUP_TIME_SLOTS[0]!
  let bestDiff = Infinity
  for (const t of allowed) {
    const [th, tm] = t.split(':').map(Number)
    const tt = (th ?? 0) * 60 + (tm ?? 0)
    const d = Math.abs(tt - total)
    if (d < bestDiff) {
      bestDiff = d
      best = t
    }
  }
  return best
}

/**
 * Date + time for the booking wizard. Used on the popular-rides step (no journey form there) and keeps
 * `pickupDatetime` in sync whenever date or time changes.
 */
export function PickupScheduleControls() {
  const pickupDate = useBookingStore((s) => s.pickupDate)
  const pickupTime = useBookingStore((s) => s.pickupTime)
  const passengers = useBookingStore((s) => s.passengers)
  const setJourney = useBookingStore((s) => s.setJourney)
  const minD = todayIsoDate()

  const allowedTimes = availablePickupTimesForDate(pickupDate)

  const scheduleHint = useMemo(() => {
    const snapped = snapPickupSchedule(pickupDate, pickupTime)
    if (snapped.error) {
      return snapped.error
    }
    return validatePickupSchedule(snapped.pickupDate, snapped.pickupTime)
  }, [pickupDate, pickupTime])

  useLayoutEffect(() => {
    const snapped = snapPickupSchedule(pickupDate, pickupTime)
    if (snapped.error) {
      return
    }
    if (snapped.pickupDate !== pickupDate || snapped.pickupTime !== pickupTime) {
      setJourney({
        pickupDate: snapped.pickupDate,
        pickupTime: snapped.pickupTime,
        pickupDatetime: toPickupIso(snapped.pickupDate, snapped.pickupTime),
      })
    } else if (!useBookingStore.getState().pickupDatetime) {
      setJourney({
        pickupDatetime: toPickupIso(snapped.pickupDate, snapped.pickupTime),
      })
    }
  }, [pickupDate, pickupTime, setJourney])

  function updateSchedule(nextDate: string, nextTime: string) {
    const date = nextDate < minD ? minD : nextDate
    const slots = availablePickupTimesForDate(date)
    const time =
      slots.length === 0 ? nextTime : slots.includes(nextTime) ? nextTime : snapToNearestSlot(nextTime, slots)
    setJourney({
      pickupDate: date,
      pickupTime: time,
      pickupDatetime: toPickupIso(date, time),
    })
  }

  const safeTime = allowedTimes.includes(pickupTime)
    ? pickupTime
    : allowedTimes.length > 0
      ? snapToNearestSlot(pickupTime, allowedTimes)
      : pickupTime

  return (
    <div className="space-y-3 rounded-2xl border border-velox-gold/25 bg-velox-gold/[0.07] p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-velox-gold-light">
        <Calendar className="h-4 w-4 shrink-0" aria-hidden />
        When do you need the car?
      </div>
      <p className="text-xs leading-relaxed text-white/55">
        Pickup must be at least 30 minutes from now. Only one trip per day can be reserved for our vehicle — if a
        day is taken, choose another date.
      </p>
      {scheduleHint ? (
        <p className="text-xs text-amber-200/90" role="status">
          {scheduleHint}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="Pickup date"
          type="date"
          min={minD}
          className="[color-scheme:dark]"
          value={pickupDate}
          onChange={(e) => updateSchedule(e.target.value, safeTime)}
        />
        <label className="block w-full space-y-1.5 text-left">
          <span className="text-xs font-medium uppercase tracking-wide text-velox-muted">Pickup time</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-velox-gold/50 focus:bg-white/[0.07] focus:ring-1 focus:ring-velox-gold/25"
            value={safeTime}
            disabled={allowedTimes.length === 0}
            onChange={(e) => updateSchedule(pickupDate, e.target.value)}
          >
            {allowedTimes.length === 0 ? (
              <option value="" className="bg-velox-midnight text-white">
                No times left today
              </option>
            ) : (
              allowedTimes.map((t) => (
                <option key={t} value={t} className="bg-velox-midnight text-white">
                  {t}
                </option>
              ))
            )}
          </select>
        </label>
        <label className="block w-full space-y-1.5 text-left">
          <span className="text-xs font-medium uppercase tracking-wide text-velox-muted">Guests</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-velox-gold/50 focus:bg-white/[0.07] focus:ring-1 focus:ring-velox-gold/25"
            value={passengers}
            onChange={(e) => setJourney({ passengers: Number(e.target.value) })}
          >
            {Array.from({ length: MAX_BOOKING_PASSENGERS }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n} className="bg-velox-midnight text-white">
                {n} {n === 1 ? 'guest' : 'guests'}
                {n <= 4 ? ' (1–4 rate)' : ' (5–8 rate)'}
              </option>
            ))}
          </select>
          <p className="text-xs text-white/45">
            Up to {MAX_BOOKING_PASSENGERS} guests · 7-seat vehicle (driver not included)
          </p>
        </label>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookingCard } from '@/components/dashboard/BookingCard'
import { BookingCardSkeleton } from '@/components/dashboard/BookingCardSkeleton'
import { EmptyBookingsState } from '@/components/dashboard/EmptyBookingsState'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { useBooking } from '@/hooks/useBooking'
import { isSupabaseConfigured } from '@/services/supabase'
import type { BookingWithVehicle } from '@/types/booking'
import { AssignedDriverContact } from '@/components/dashboard/AssignedDriverContact'
import { ROUTES } from '@/utils/constants'
import { formatCurrencyMajor, formatDateTime } from '@/utils/formatters'
import { groupBookingsBySegment, type ClientBookingSegment } from '@/utils/segmentClientBooking'
import { cn } from '@/utils/cn'

const SEGMENTS: { id: ClientBookingSegment; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'in_progress', label: 'In progress' },
]

function BookingDetailReadout({ booking }: { booking: BookingWithVehicle }) {
  const paid = booking.finalPrice ?? booking.estimatedPrice
  return (
    <dl className="space-y-3 text-sm text-white/85">
      <div className="flex justify-between gap-4">
        <dt className="text-velox-muted">Vehicle</dt>
        <dd className="text-right font-medium text-white">{booking.vehicleName ?? '—'}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-velox-muted">Pickup</dt>
        <dd className="max-w-[60%] text-right">{formatDateTime(booking.pickupDatetime)}</dd>
      </div>
      <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
        <dt className="text-velox-muted">From</dt>
        <dd className="text-xs leading-relaxed text-white/80">{booking.pickupAddress}</dd>
      </div>
      <div className="flex flex-col gap-1">
        <dt className="text-velox-muted">To</dt>
        <dd className="text-xs leading-relaxed text-white/80">{booking.dropoffAddress}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-velox-muted">Passengers</dt>
        <dd className="text-right">{booking.passengers}</dd>
      </div>
      {booking.flightNumber ? (
        <div className="flex justify-between gap-4">
          <dt className="text-velox-muted">Flight</dt>
          <dd className="text-right">{booking.flightNumber}</dd>
        </div>
      ) : null}
      {booking.specialRequests ? (
        <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
          <dt className="text-velox-muted">Special requests</dt>
          <dd className="text-xs leading-relaxed text-white/75">{booking.specialRequests}</dd>
        </div>
      ) : null}
      {booking.driver && booking.driverId ? (
        <AssignedDriverContact driver={booking.driver} className="border-t border-white/10 pt-3" />
      ) : null}
      <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
        <dt className="font-medium text-white">Price</dt>
        <dd className="font-display text-lg text-velox-gold-light">
          {paid != null ? formatCurrencyMajor(paid, booking.currency) : '—'}
        </dd>
      </div>
    </dl>
  )
}

export function MyBookingsPanel() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id
  const {
    bookings,
    isBookingsLoading,
    bookingsError,
    isBookingsEmpty,
    cancelBooking,
    isCancellingBooking,
    cancellingBookingId,
  } = useBooking(undefined, { userBookingsRealtime: Boolean(isSupabaseConfigured) })

  const [segment, setSegment] = useState<ClientBookingSegment>('upcoming')
  const [detailBooking, setDetailBooking] = useState<BookingWithVehicle | null>(null)
  const [cancelBookingTarget, setCancelBookingTarget] = useState<BookingWithVehicle | null>(null)
  const didAutoPickSegment = useRef(false)

  const { upcoming, inProgress } = useMemo(() => {
    const grouped = groupBookingsBySegment(bookings)
    return { upcoming: grouped.upcoming, inProgress: grouped.inProgress }
  }, [bookings])

  useEffect(() => {
    didAutoPickSegment.current = false
  }, [userId])

  useEffect(() => {
    if (!userId || isBookingsLoading || bookings.length === 0 || didAutoPickSegment.current) {
      return
    }
    didAutoPickSegment.current = true
    const next: ClientBookingSegment =
      upcoming.length > 0 ? 'upcoming' : inProgress.length > 0 ? 'in_progress' : 'upcoming'
    queueMicrotask(() => setSegment(next))
  }, [userId, isBookingsLoading, bookings.length, upcoming.length, inProgress.length])

  const listForSegment = useMemo(() => {
    if (segment === 'upcoming') {
      return upcoming
    }
    if (segment === 'in_progress') {
      return inProgress
    }
    return []
  }, [segment, upcoming, inProgress])

  async function confirmCancel() {
    if (!cancelBookingTarget) {
      return
    }
    try {
      await cancelBooking(cancelBookingTarget.id)
      setCancelBookingTarget(null)
      if (detailBooking?.id === cancelBookingTarget.id) {
        setDetailBooking(null)
      }
    } catch {
      console.warn('[MyBookingsPanel] cancel failed')
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <Card title="Configuration needed">
        <p className="text-sm text-velox-muted">Connect Supabase to load your reservations.</p>
      </Card>
    )
  }

  if (bookingsError) {
    return (
      <Card title="Could not load trips">
        <p className="text-sm text-red-200">
          {bookingsError instanceof Error ? bookingsError.message : 'Unexpected error.'}
        </p>
      </Card>
    )
  }

  if (isBookingsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {SEGMENTS.map((s) => (
            <div key={s.id} className="h-9 flex-1 rounded-lg bg-white/5" />
          ))}
        </div>
        <BookingCardSkeleton />
        <BookingCardSkeleton />
        <BookingCardSkeleton />
      </div>
    )
  }

  if (isBookingsEmpty) {
    return <EmptyBookingsState />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-black/25 p-1">
        {SEGMENTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSegment(s.id)}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-center text-xs font-medium uppercase tracking-wide transition sm:flex-none sm:px-5',
              segment === s.id
                ? 'bg-white/10 text-velox-gold-light shadow-inner'
                : 'text-white/45 hover:text-white/75',
            )}
          >
            {s.label}
            <span className="ml-1.5 text-[10px] font-normal text-white/35">
              {s.id === 'upcoming' ? upcoming.length : inProgress.length}
            </span>
          </button>
        ))}
      </div>

      {listForSegment.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
          <p className="text-sm text-velox-muted">Nothing in this view right now.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {listForSegment.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onViewDetails={() => setDetailBooking(b)}
              onCancel={b.status === 'pending' ? () => setCancelBookingTarget(b) : undefined}
              isCancelling={isCancellingBooking && cancellingBookingId === b.id}
            />
          ))}
        </div>
      )}

      <Modal
        open={detailBooking != null}
        title="Booking details"
        description="Full itinerary for this reservation."
        onClose={() => setDetailBooking(null)}
        bodyClassName="max-h-[65vh] overflow-y-auto pr-1"
        footer={
          detailBooking ? (
            <div className="flex w-full flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setDetailBooking(null)}>
                Close
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setDetailBooking(null)
                  navigate(ROUTES.confirmationBooking(detailBooking.id))
                }}
              >
                Open confirmation page
              </Button>
            </div>
          ) : null
        }
      >
        {detailBooking ? <BookingDetailReadout booking={detailBooking} /> : null}
      </Modal>

      <Modal
        open={cancelBookingTarget != null}
        title="Cancel this booking?"
        description="Pending reservations can be cancelled here. If you have already paid, contact concierge for changes."
        onClose={() => setCancelBookingTarget(null)}
        footer={
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCancelBookingTarget(null)}>
              Keep booking
            </Button>
            <Button type="button" variant="danger" isLoading={isCancellingBooking} onClick={() => void confirmCancel()}>
              Yes, cancel
            </Button>
          </div>
        }
      >
        {cancelBookingTarget ? (
          <div className="space-y-3 text-sm text-white/80">
            <p>
              <span className="text-velox-muted">Pickup: </span>
              {formatDateTime(cancelBookingTarget.pickupDatetime)}
            </p>
            <p className="text-xs leading-relaxed text-white/60">{cancelBookingTarget.pickupAddress}</p>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

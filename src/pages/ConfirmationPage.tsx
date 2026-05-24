import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { BookingTimeline } from '@/components/booking/BookingTimeline'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/useAuth'
import { usePageMeta } from '@/hooks/usePageMeta'
import { useBooking } from '@/hooks/useBooking'
import { startHostedStripeCheckout } from '@/services/stripeService'
import { isSupabaseConfigured } from '@/services/supabase'
import { APP_NAME, QUERY_KEYS, ROUTES } from '@/utils/constants'
import { formatCurrencyMajor, formatDateTime } from '@/utils/formatters'

export function ConfirmationPage() {
  usePageMeta({
    title: 'Reservation & payment',
    description: `Review your ${APP_NAME} itinerary, pay securely with Stripe, and receive your confirmation details.`,
  })
  const queryClient = useQueryClient()
  const { id: idParam } = useParams()
  const [params] = useSearchParams()
  const bookingId = idParam ?? params.get('id')
  const stripeSession = params.get('session_id')
  const { booking, isBookingLoading, bookingError } = useBooking(bookingId ?? undefined)
  const { user } = useAuth()
  const [stripeError, setStripeError] = useState<string | null>(null)
  const [stripeStarting, setStripeStarting] = useState(false)

  useEffect(() => {
    if (!stripeSession || !bookingId) {
      return
    }
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bookings })
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.booking(bookingId) })
  }, [stripeSession, bookingId, queryClient])

  if (!bookingId) {
    return (
      <PageWrapper title="Missing reservation">
        <Card title="No booking selected">
          <p className="text-sm text-velox-muted">Return to booking and complete the form to receive a link.</p>
          <Link className="mt-4 inline-block text-sm text-velox-gold-light underline" to={ROUTES.book}>
            Start a booking
          </Link>
        </Card>
      </PageWrapper>
    )
  }

  if (isBookingLoading) {
    return (
      <PageWrapper title="Your reservation">
        <Spinner label="Retrieving reservation" />
      </PageWrapper>
    )
  }

  if (bookingError) {
    return (
      <PageWrapper title="Your reservation">
        <Card title="Something went wrong">
          <p className="text-sm text-red-200">
            {bookingError instanceof Error ? bookingError.message : 'Unable to load this booking.'}
          </p>
        </Card>
      </PageWrapper>
    )
  }

  if (!booking) {
    return (
      <PageWrapper title="Your reservation">
        <Card title="Reservation not found">
          <p className="text-sm text-velox-muted">We could not find a booking with that identifier.</p>
        </Card>
      </PageWrapper>
    )
  }

  const headline = booking.status === 'pending' ? 'Reservation received' : 'Reservation confirmed'

  const customerEmail = user?.email ?? ''

  async function handlePayWithCard() {
    if (!booking || !customerEmail || stripeStarting) {
      return
    }
    setStripeError(null)
    setStripeStarting(true)
    let redirected = false
    try {
      await startHostedStripeCheckout(booking.id, customerEmail, booking.currency)
      redirected = true
    } catch (e) {
      setStripeError(e instanceof Error ? e.message : 'Could not start payment.')
    } finally {
      if (!redirected) {
        setStripeStarting(false)
      }
    }
  }

  return (
    <PageWrapper
      title={headline}
      subtitle="Review your itinerary, complete payment if required, and your dispatch team will monitor the route."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card title="Trip overview">
          <dl className="grid gap-3 text-sm text-white/85">
            <div className="flex justify-between gap-4">
              <dt className="text-velox-muted">Pickup</dt>
              <dd className="text-right">{formatDateTime(booking.pickupDatetime)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-velox-muted">From</dt>
              <dd className="max-w-md text-right">{booking.pickupAddress}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-velox-muted">To</dt>
              <dd className="max-w-md text-right">{booking.dropoffAddress}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-velox-muted">Estimated total</dt>
              <dd className="text-right font-medium text-velox-gold-light">
                {booking.estimatedPrice != null
                  ? formatCurrencyMajor(booking.estimatedPrice, booking.currency)
                  : '—'}
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="Journey status">
          <BookingTimeline status={booking.status} />
        </Card>
      </div>

      {stripeSession ? (
        <p className="mt-6 text-center text-sm text-white/60">
          If your payment just finished, go to the dashboard to see the updated status. It may take a few seconds to update — refresh if needed. otherwise,click the pay with card button
        </p>
      ) : null}

      {booking.status === 'pending' && booking.paymentMethod === 'stripe' && isSupabaseConfigured && customerEmail ? (
        <div className="mt-8 space-y-4">
          {stripeError ? (
            <Card title="Payment">
              <p className="text-sm text-red-200">{stripeError}</p>
              <Button type="button" variant="secondary" className="mt-3" onClick={() => setStripeError(null)}>
                Dismiss
              </Button>
            </Card>
          ) : null}
          <Card title="Pay with card" description="You will be redirected to Stripe’s secure checkout page.">
            <Button
              type="button"
              isLoading={stripeStarting}
              disabled={stripeStarting}
              onClick={() => void handlePayWithCard()}
            >
              Continue to Stripe checkout
            </Button>
          </Card>
        </div>
      ) : null}

      {booking.status === 'pending' && booking.paymentMethod === 'stripe' && !customerEmail ? (
        <Card className="mt-6" title="Sign in required">
          <p className="text-sm text-velox-muted">Sign in with an email-backed account to complete payment.</p>
          <Button to={ROUTES.login} className="mt-4" variant="primary">
            Client login
          </Button>
        </Card>
      ) : null}

      {booking.status === 'confirmed' && booking.paymentMethod === 'cash' ? (
        <Card className="mt-8" title="Cash payment">
          <p className="text-sm text-white/80">
            This reservation is confirmed. Please pay your chauffeur in cash on the day of travel
            {booking.estimatedPrice != null && booking.estimatedPrice > 0
              ? ` (${formatCurrencyMajor(booking.estimatedPrice, booking.currency)})`
              : booking.bookingType === 'custom'
                ? ' (fare agreed with your chauffeur on the day)'
                : '.'}
            {booking.estimatedPrice != null && booking.estimatedPrice > 0 ? '.' : ''}
          </p>
        </Card>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button to={ROUTES.dashboard} variant="secondary">
          View dashboard
        </Button>
        <Button to={ROUTES.book} variant="ghost">
          Book another trip
        </Button>
      </div>
    </PageWrapper>
  )
}

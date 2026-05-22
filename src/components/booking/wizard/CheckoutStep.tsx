import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/useAuth'
import { useBooking } from '@/hooks/useBooking'
import { confirmBookingCash } from '@/services/bookingService'
import { startHostedStripeCheckout } from '@/services/stripeService'
import { isSupabaseConfigured } from '@/services/supabase'
import { useBookingStore } from '@/stores/bookingStore'
import { bookingChargeAmount } from '@/types/booking'
import { QUERY_KEYS } from '@/utils/constants'
import { withTimeout } from '@/utils/async'
import { formatCurrencyMajor, formatDateTime } from '@/utils/formatters'

type CheckoutStepProps = {
  onBack: () => void
  onPaid: (bookingId: string) => void
}

export function CheckoutStep({ onBack, onPaid }: CheckoutStepProps) {
  const checkoutId = useBookingStore((s) => s.checkoutBookingId)
  const fullName = useBookingStore((s) => s.fullName)
  const email = useBookingStore((s) => s.email)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { booking, isBookingLoading, bookingError } = useBooking(checkoutId ?? undefined)
  const isCustomCash = booking?.bookingType === 'custom'
  const [payMode, setPayMode] = useState<'stripe' | 'cash'>('stripe')
  const [stripeError, setStripeError] = useState<string | null>(null)
  const [stripeStarting, setStripeStarting] = useState(false)
  const [stripeStatus, setStripeStatus] = useState<string | null>(null)

  const cashMutation = useMutation({
    retry: 0,
    mutationFn: async (bookingId: string) => confirmBookingCash(bookingId),
    onSuccess: (_data, bookingId) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bookings })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.booking(bookingId) })
    },
  })

  const customerEmail = email.trim() || user?.email || ''
  const charge = booking ? bookingChargeAmount(booking) : null
  const total =
    charge != null && charge > 0 ? formatCurrencyMajor(charge, booking?.currency ?? 'eur') : null

  async function handlePayWithCard() {
    if (!booking || stripeStarting || charge == null || charge <= 0) {
      return
    }
    setStripeError(null)
    setStripeStatus('Preparing secure checkout…')
    setStripeStarting(true)
    let redirected = false
    try {
      setStripeStatus('Connecting to Stripe…')
      await withTimeout(
        startHostedStripeCheckout(booking.id, customerEmail, booking.currency),
        35_000,
        'Stripe checkout is taking too long. Check your connection and try again.',
      )
      redirected = true
      setStripeStatus('Redirecting to Stripe…')
    } catch (e) {
      setStripeError(e instanceof Error ? e.message : 'Could not start payment.')
      setStripeStatus(null)
    } finally {
      if (!redirected) {
        setStripeStarting(false)
      }
    }
  }

  if (!checkoutId) {
    return (
      <Card title="Checkout not ready">
        <p className="text-sm text-velox-muted">Complete your details before payment.</p>
        <Button type="button" variant="secondary" className="mt-4" onClick={onBack}>
          Back
        </Button>
      </Card>
    )
  }

  if (isBookingLoading) {
    return <Spinner label="Preparing checkout" />
  }

  if (bookingError || !booking) {
    return (
      <Card title="Could not load booking">
        <p className="text-sm text-red-200">
          {bookingError instanceof Error ? bookingError.message : 'Try going back and continuing again.'}
        </p>
        <Button type="button" variant="secondary" className="mt-4" onClick={onBack}>
          Back
        </Button>
      </Card>
    )
  }

  if (!isCustomCash && (charge == null || charge <= 0)) {
    return (
      <Card title="Price unavailable">
        <p className="text-sm text-velox-muted">
          This booking has no price set. Go back and try again, or contact concierge.
        </p>
        <Button type="button" variant="secondary" className="mt-4" onClick={onBack}>
          Back
        </Button>
      </Card>
    )
  }

  const summaryCard = (
    <Card
      hoverGlow
      title="Booking summary"
      description={
        isCustomCash
          ? 'Custom itineraries are confirmed now; you pay your chauffeur in cash on the day of travel.'
          : 'Review every detail before you pay by card or confirm cash on service.'
      }
    >
      <dl className="grid gap-3 text-sm text-white/85">
        <div className="flex justify-between gap-4">
          <dt className="text-velox-muted">Type</dt>
          <dd className="text-right capitalize">{booking.bookingType} route</dd>
        </div>
        {booking.routeTitle ? (
          <div className="flex justify-between gap-4">
            <dt className="text-velox-muted">Route</dt>
            <dd className="text-right font-medium text-white">{booking.routeTitle}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-velox-muted">Guest</dt>
          <dd className="text-right font-medium text-white">{fullName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-velox-muted">Pickup</dt>
          <dd className="text-right">{formatDateTime(booking.pickupDatetime)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-velox-muted">Itinerary</dt>
          <dd className="max-w-md text-right text-xs leading-relaxed">
            {booking.pickupAddress} → {booking.dropoffAddress}
          </dd>
        </div>
      </dl>
    </Card>
  )

  if (isCustomCash) {
    return (
      <div className="space-y-6">
        {summaryCard}
        {booking.status === 'pending' && isSupabaseConfigured ? (
          <Card
            title="Cash to driver"
            description="Fare is agreed with your chauffeur on the day of travel — not charged online."
          >
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={cashMutation.isPending}
              isLoading={cashMutation.isPending}
              onClick={() =>
                void cashMutation.mutateAsync(booking.id).then(() => {
                  onPaid(booking.id)
                })
              }
            >
              Confirm reservation — pay driver in cash
            </Button>
          </Card>
        ) : null}
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {summaryCard}

      <Card hoverGlow title="Trip total" description="This is the exact amount charged on Stripe.">
        <p className="font-display text-3xl text-velox-gold-light">{total}</p>
      </Card>

      {booking.status === 'pending' && isSupabaseConfigured ? (
        <Card title="Payment" description="Pay securely with Stripe, or reserve now and pay your chauffeur in cash.">
          <div className="grid gap-3 sm:grid-cols-2">
            <label
              className={`flex cursor-pointer flex-col gap-1 rounded-xl border px-4 py-3 text-sm transition ${
                payMode === 'stripe'
                  ? 'border-velox-gold/60 bg-velox-gold/10 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/80 hover:border-white/20'
              }`}
            >
              <span className="flex items-center gap-2 font-medium text-white">
                <input
                  type="radio"
                  name="velox-pay"
                  className="accent-velox-gold"
                  checked={payMode === 'stripe'}
                  onChange={() => setPayMode('stripe')}
                />
                Card (Stripe)
              </span>
            </label>
            <label
              className={`flex cursor-pointer flex-col gap-1 rounded-xl border px-4 py-3 text-sm transition ${
                payMode === 'cash'
                  ? 'border-velox-gold/60 bg-velox-gold/10 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/80 hover:border-white/20'
              }`}
            >
              <span className="flex items-center gap-2 font-medium text-white">
                <input
                  type="radio"
                  name="velox-pay"
                  className="accent-velox-gold"
                  checked={payMode === 'cash'}
                  onChange={() => setPayMode('cash')}
                />
                Cash to driver
              </span>
            </label>
          </div>
        </Card>
      ) : null}

      {payMode === 'stripe' && stripeError ? (
        <Card title="Payment">
          <p className="text-sm text-red-200">{stripeError}</p>
        </Card>
      ) : null}

      {booking.status === 'pending' && payMode === 'stripe' && isSupabaseConfigured && customerEmail.includes('@') ? (
        <Card title="Card payment">
          {stripeStatus ? (
            <p className="mb-3 text-sm text-velox-gold-light/90" role="status">
              {stripeStatus}
            </p>
          ) : null}
          <Button
            type="button"
            className="w-full sm:w-auto"
            isLoading={stripeStarting}
            disabled={stripeStarting}
            onClick={() => void handlePayWithCard()}
          >
            Continue to secure Stripe checkout — {total}
          </Button>
        </Card>
      ) : null}

      {booking.status === 'pending' && payMode === 'cash' && isSupabaseConfigured ? (
        <Card title="Confirm cash reservation">
          <Button
            type="button"
            className="mt-4"
            disabled={cashMutation.isPending}
            isLoading={cashMutation.isPending}
            onClick={() =>
              void cashMutation.mutateAsync(booking.id).then(() => {
                onPaid(booking.id)
              })
            }
          >
            Confirm reservation — pay cash ({total})
          </Button>
        </Card>
      ) : null}

      <Button type="button" variant="ghost" onClick={onBack}>
        Back
      </Button>
    </div>
  )
}

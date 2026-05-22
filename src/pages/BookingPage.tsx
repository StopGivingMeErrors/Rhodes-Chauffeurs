import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { validatePickupSchedule } from '@/utils/bookingPickupValidation'
import { Link, useNavigate } from 'react-router-dom'
import { CheckoutStep } from '@/components/booking/wizard/CheckoutStep'
import { ContactStep } from '@/components/booking/wizard/ContactStep'
import { JourneyStep } from '@/components/booking/wizard/JourneyStep'
import { PopularRidesSection } from '@/components/booking/wizard/PopularRidesSection'
import { StepIndicator } from '@/components/booking/wizard/StepIndicator'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/hooks/useAuth'
import { usePageMeta } from '@/hooks/usePageMeta'
import { useBooking } from '@/hooks/useBooking'
import { resolveActiveSessionUserId } from '@/services/authService'
import { getBookingById } from '@/services/bookingService'
import { getRouteById } from '@/services/routeService'
import { isSupabaseConfigured } from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useBookingStore } from '@/stores/bookingStore'
import {
  buildCustomRouteDraft,
  buildFixedRouteDraft,
  draftMatchesBooking,
  fingerprintFromDraft,
} from '@/utils/bookingWizard'
import { withTimeout } from '@/utils/async'
import { cn } from '@/utils/cn'
import { ROUTES } from '@/utils/constants'
import type { BookingContactValues } from '@/utils/validators'

const STEP_SUBTITLES: Record<1 | 2 | 3, string> = {
  1: 'Pick a fixed route with a published price, or enter your own addresses for a custom trip (cash to driver).',
  2: 'Confirm your contact details for the chauffeur team.',
  3: 'Review your trip and complete payment.',
}

export function BookingPage() {
  usePageMeta({
    title: 'Book a ride',
    description: 'Book fixed VIP routes online or request a custom itinerary (cash to driver) with Velox VIP.',
  })
  const navigate = useNavigate()
  const { user, profile, updateClientProfile } = useAuth()
  const { createBooking, updatePendingBooking } = useBooking()

  const currentStep = useBookingStore((s) => s.currentStep)
  const routeId = useBookingStore((s) => s.routeId)
  const lockedRoutePrice = useBookingStore((s) => s.lockedRoutePrice)
  const setStep = useBookingStore((s) => s.setStep)
  const setContact = useBookingStore((s) => s.setContact)
  const setCheckout = useBookingStore((s) => s.setCheckout)
  const resetWizard = useBookingStore((s) => s.resetWizard)
  const applyFixedRoute = useBookingStore((s) => s.applyFixedRoute)
  const prepareCustomRouteForm = useBookingStore((s) => s.prepareCustomRouteForm)
  const setCustomRouteReady = useBookingStore((s) => s.setCustomRouteReady)
  const [step1Custom, setStep1Custom] = useState(false)
  const [step1ScheduleError, setStep1ScheduleError] = useState<string | null>(null)
  const contactFlowLock = useRef(false)

  function assertStep1Schedule(): boolean {
    const s = useBookingStore.getState()
    const err = validatePickupSchedule(s.pickupDate, s.pickupTime)
    setStep1ScheduleError(err)
    return err === null
  }

  useLayoutEffect(() => {
    const uid = user?.id
    const sessionEmail = user?.email?.trim()
    if (!uid || !sessionEmail) return
    const st = useBookingStore.getState()
    if (st.email.trim().toLowerCase() === sessionEmail.toLowerCase()) return
    setContact({
      email: sessionEmail,
      ...(profile?.id === uid
        ? { fullName: profile.fullName?.trim() || st.fullName, phone: profile.phone?.trim() || st.phone }
        : {}),
    })
  }, [user?.id, user?.email, profile?.id, profile?.fullName, profile?.phone, setContact])

  useLayoutEffect(() => {
    const s = useBookingStore.getState()
    if (currentStep >= 2 && !s.bookingType) {
      setStep(1)
    }
  }, [currentStep, setStep])

  useEffect(() => {
    if (currentStep !== 3) return
    const st = useBookingStore.getState()
    if (st.checkoutBookingId) return
    const sessionUser = useAuthStore.getState().session?.user
    if (!sessionUser?.id) {
      setStep(2)
      return
    }
    const tryId = st.lastCreatedBookingId
    if (!tryId) {
      setStep(2)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const b = await getBookingById(tryId)
        if (cancelled) return
        if (
          b &&
          b.status === 'pending' &&
          b.clientId === sessionUser.id &&
          (b.paymentMethod === 'stripe' || (b.bookingType === 'custom' && b.paymentMethod === 'cash'))
        ) {
          setCheckout(tryId, st.checkoutFingerprint, sessionUser.id)
          return
        }
      } catch {
        /* fall through */
      }
      if (!cancelled) setStep(2)
    })()
    return () => {
      cancelled = true
    }
  }, [currentStep, setStep, setCheckout])

  const handleContactContinue = useCallback(
    async (values: BookingContactValues) => {
      if (contactFlowLock.current) return
      contactFlowLock.current = true
      try {
        const sessionUid = await withTimeout(
          resolveActiveSessionUserId(),
          20_000,
          'Could not verify your session. Refresh the page or sign in again, then continue.',
        )

        setContact({
          fullName: values.fullName.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          specialRequests: values.specialRequests?.trim() ?? '',
          saveToProfile: values.saveToProfile,
        })

        if (values.saveToProfile) {
          await updateClientProfile({ fullName: values.fullName.trim(), phone: values.phone.trim() })
        }

        const s = useBookingStore.getState()
        if (s.wizardOwnerId && s.wizardOwnerId !== sessionUid) {
          s.resetWizard()
        }
        const scheduleErr = validatePickupSchedule(s.pickupDate, s.pickupTime)
        if (scheduleErr) {
          throw new Error(scheduleErr)
        }
        if (!s.pickupDatetime) {
          throw new Error('Complete route details before continuing.')
        }

        let draft
        if (s.bookingType === 'fixed') {
          if (!s.routeId) throw new Error('Select a fixed route to continue.')
          const route = await getRouteById(s.routeId)
          if (!route || !route.active) {
            throw new Error('This route is no longer available. Pick another route.')
          }
          draft = buildFixedRouteDraft({
            route,
            pickupDatetime: s.pickupDatetime,
            passengers: s.passengers,
            flightNumber: s.flightNumber.trim() ? s.flightNumber.trim() : null,
            specialRequests: s.specialRequests.trim() ? s.specialRequests.trim() : null,
          })
        } else if (s.bookingType === 'custom') {
          draft = buildCustomRouteDraft({
            pickupDatetime: s.pickupDatetime,
            pickupAddress: s.pickupAddress,
            dropoffAddress: s.dropoffAddress,
            passengers: s.passengers,
            flightNumber: s.flightNumber.trim() ? s.flightNumber.trim() : null,
            specialRequests: s.specialRequests.trim() ? s.specialRequests.trim() : null,
            pickupLat: s.pickupLat,
            pickupLng: s.pickupLng,
            dropoffLat: s.dropoffLat,
            dropoffLng: s.dropoffLng,
          })
        } else {
          throw new Error('Choose a fixed route or custom itinerary first.')
        }

        const fp = fingerprintFromDraft(draft)

        if (s.checkoutBookingId) {
          await updatePendingBooking({ id: s.checkoutBookingId, draft })
          setCheckout(s.checkoutBookingId, fp, sessionUid)
        } else {
          let reuseId: string | null = null
          const lid = s.lastCreatedBookingId
          if (lid) {
            try {
              const existing = await getBookingById(lid)
              if (existing && existing.clientId === sessionUid && draftMatchesBooking(draft, existing)) {
                reuseId = existing.id
              }
            } catch {
              /* create new */
            }
          }
          if (reuseId) {
            await updatePendingBooking({ id: reuseId, draft })
            setCheckout(reuseId, fp, sessionUid)
          } else {
            const booking = await createBooking(draft)
            setCheckout(booking.id, fp, sessionUid)
          }
        }

        setStep(3)
      } finally {
        contactFlowLock.current = false
      }
    },
    [setContact, setCheckout, setStep, updateClientProfile, createBooking, updatePendingBooking],
  )

  const handlePaid = useCallback(
    (bookingId: string) => {
      resetWizard()
      navigate(ROUTES.confirmationBooking(bookingId), { replace: true })
    },
    [navigate, resetWizard],
  )

  if (!isSupabaseConfigured) {
    return (
      <PageWrapper title="Book travel" subtitle="Configure Supabase to load routes.">
        <Card title="Environment required">
          <p className="text-sm text-velox-muted">Add Supabase env vars and restart the dev server.</p>
        </Card>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper title="Compose your journey" subtitle={STEP_SUBTITLES[currentStep]}>
      <div className="mx-auto max-w-4xl space-y-8 px-4 pb-16">
        <nav aria-label="Booking steps" className="block">
          <StepIndicator current={currentStep} />
        </nav>

        <Card
          title={
            currentStep === 1
              ? step1Custom
                ? 'Custom route'
                : 'Choose your route'
              : currentStep === 2
                ? 'Contact & requests'
                : 'Payment'
          }
          description="Velox VIP concierge routing"
          hoverGlow={currentStep === 3}
        >
          <div key={currentStep} className={cn('velox-booking-step', currentStep === 3 && 'space-y-6')}>
            {currentStep === 1 ? (
              step1Custom ? (
                <JourneyStep
                  isCustomRoute
                  onNext={() => {
                    if (!assertStep1Schedule()) return
                    setCustomRouteReady()
                    setStep1Custom(false)
                    setStep(2)
                  }}
                  onCancelCustom={() => {
                    setStep1Custom(false)
                  }}
                />
              ) : (
                <div className="space-y-8">
                  <PopularRidesSection
                    selectedRouteId={routeId}
                    onSelectRoute={(route) => applyFixedRoute(route)}
                  />
                  {step1ScheduleError ? (
                    <p className="text-sm text-amber-200/90" role="alert">
                      {step1ScheduleError}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-6">
                    <Button
                      type="button"
                      variant="success"
                      disabled={!routeId || lockedRoutePrice == null}
                      onClick={() => {
                        if (!assertStep1Schedule()) return
                        setStep(2)
                      }}
                    >
                      Continue with selected route
                    </Button>
                  </div>
                  <div className="border-t border-white/10 pt-8">
                    <p className="mb-3 text-sm font-medium text-white">Custom route</p>
                    <p className="mb-4 text-xs text-white/50">
                      Enter any pickup and drop-off in Rhodes. Custom trips are reserved online; fare is paid in
                      cash to your chauffeur on the day of travel (not by card).
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        prepareCustomRouteForm()
                        setStep1Custom(true)
                      }}
                    >
                      Book custom route (cash)
                    </Button>
                  </div>
                </div>
              )
            ) : null}

            {currentStep === 2 ? (
              <ContactStep
                profile={profile}
                defaultEmail={user?.email ?? null}
                onBack={() => setStep(1)}
                onContinue={handleContactContinue}
              />
            ) : null}

            {currentStep === 3 ? (
              <CheckoutStep onBack={() => setStep(2)} onPaid={handlePaid} />
            ) : null}
          </div>
        </Card>

        <p className="text-center text-xs text-white/55">
          <Link className="text-velox-gold-light underline underline-offset-2" to={ROUTES.home}>
            Return home
          </Link>
        </p>
      </div>
    </PageWrapper>
  )
}

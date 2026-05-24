import { zodResolver } from '@hookform/resolvers/zod'
import { MapPin, Navigation } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { availablePickupTimesForDate } from '@/utils/bookingPickupValidation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useBookingStore } from '@/stores/bookingStore'
import { journeyStepSchema, type JourneyStepValues } from '@/utils/validators'
import { toPickupIso } from '@/utils/bookingWizard'

type JourneyStepProps = {
  onNext: () => void
  /** When set (e.g. popular rides vs custom toggle), show a way back without advancing. */
  onCancelCustom?: () => void
  isCustomRoute?: boolean
}

export function JourneyStep({ onNext, onCancelCustom, isCustomRoute }: JourneyStepProps) {
  const pickupAddress = useBookingStore((s) => s.pickupAddress)
  const dropoffAddress = useBookingStore((s) => s.dropoffAddress)
  const pickupDate = useBookingStore((s) => s.pickupDate)
  const pickupTime = useBookingStore((s) => s.pickupTime)
  const passengers = useBookingStore((s) => s.passengers)
  const flightNumber = useBookingStore((s) => s.flightNumber)
  const setJourney = useBookingStore((s) => s.setJourney)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<JourneyStepValues>({
    resolver: zodResolver(journeyStepSchema),
    defaultValues: {
      pickupAddress,
      dropoffAddress,
      pickupDate,
      pickupTime,
      passengers,
      flightNumber: flightNumber || '',
    },
  })

  const watchedDate = useWatch({ control, name: 'pickupDate' }) ?? pickupDate
  const timeSlots = availablePickupTimesForDate(watchedDate || pickupDate)

  function onSubmit(values: JourneyStepValues) {
    const pickupDatetime = toPickupIso(values.pickupDate, values.pickupTime)
    setJourney({
      pickupAddress: values.pickupAddress.trim(),
      dropoffAddress: values.dropoffAddress.trim(),
      pickupDate: values.pickupDate,
      pickupTime: values.pickupTime,
      passengers: values.passengers,
      flightNumber: values.flightNumber?.trim() ?? '',
      pickupLat: null,
      pickupLng: null,
      dropoffLat: null,
      dropoffLng: null,
      pickupDatetime,
    })
    onNext()
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-4 lg:grid-cols-2">
        <Input
          label="Pickup address"
          placeholder="Street, city, or landmark"
          icon={<MapPin />}
          error={errors.pickupAddress?.message}
          autoComplete="street-address"
          {...register('pickupAddress')}
        />
        <Input
          label="Drop-off address"
          placeholder="Where should we take you?"
          icon={<Navigation />}
          error={errors.dropoffAddress?.message}
          autoComplete="street-address"
          {...register('dropoffAddress')}
        />
      </div>
      {isCustomRoute ? (
        <p className="rounded-xl border border-velox-gold/30 bg-velox-gold/10 px-4 py-3 text-sm text-velox-gold-light">
          Custom route — you will confirm your reservation online and pay your chauffeur in cash on the day of
          travel. Fare is not charged by card.
        </p>
      ) : (
        <p className="text-xs text-white/40">Enter pickup and drop-off; your fare is shown before you pay.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Date"
          type="date"
          className="[color-scheme:dark]"
          error={errors.pickupDate?.message}
          {...register('pickupDate')}
        />
        <label className="block w-full space-y-1.5 text-left">
          <span className="text-xs font-medium uppercase tracking-wide text-velox-muted">Time (15 min)</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-velox-gold/50 focus:bg-white/[0.07] focus:ring-1 focus:ring-velox-gold/25"
            {...register('pickupTime')}
          >
            {timeSlots.length === 0 ? (
              <option value="" className="bg-velox-midnight text-white">
                No times left today
              </option>
            ) : (
              timeSlots.map((t) => (
                <option key={t} value={t} className="bg-velox-midnight text-white">
                  {t}
                </option>
              ))
            )}
          </select>
          {errors.pickupTime?.message ? (
            <span className="text-xs text-red-300">{errors.pickupTime.message}</span>
          ) : null}
        </label>
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
          <span className="text-xs font-medium uppercase tracking-wide text-velox-muted">Passengers</span>
          <Controller
            name="passengers"
            control={control}
            render={({ field }) => (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={field.value <= 1}
                  aria-label="Decrease passenger count"
                  onClick={() => field.onChange(Math.max(1, field.value - 1))}
                >
                  −
                </Button>
                <span className="font-display text-lg text-white">{field.value}</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={field.value >= 12}
                  aria-label="Increase passenger count"
                  onClick={() => field.onChange(Math.min(12, field.value + 1))}
                >
                  +
                </Button>
              </div>
            )}
          />
          {errors.passengers?.message ? (
            <span className="text-xs text-red-300">{errors.passengers.message}</span>
          ) : null}
        </div>
      </div>

      <Input
        label="Airport pickup?"
        placeholder="Flight number (optional)"
        error={errors.flightNumber?.message}
        {...register('flightNumber')}
      />

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        {onCancelCustom ? (
          <Button type="button" variant="ghost" onClick={onCancelCustom} aria-label="Back to popular rides">
            Popular rides
          </Button>
        ) : null}
        <Button
          type="submit"
          isLoading={isSubmitting}
          aria-label="Continue to contact details"
        >
          {isCustomRoute ? 'Continue to contact' : 'Continue to contact'}
        </Button>
      </div>
    </form>
  )
}

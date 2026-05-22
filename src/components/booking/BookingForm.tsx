import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { bookingFormSchema, type BookingFormValues } from '@/utils/validators'

type BookingFormProps = {
  defaultVehicleId?: string
  onSubmit: (values: BookingFormValues) => Promise<void>
  isSubmitting?: boolean
}

export function BookingForm({ defaultVehicleId, onSubmit, isSubmitting }: BookingFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      vehicleId: defaultVehicleId ?? '',
      pickupDatetime: '',
      pickupAddress: '',
      dropoffAddress: '',
      passengers: 2,
      flightNumber: '',
      specialRequests: '',
    },
  })

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <input type="hidden" {...register('vehicleId')} />
      <Input
        label="Pickup time"
        type="datetime-local"
        error={errors.pickupDatetime?.message}
        {...register('pickupDatetime')}
      />
      <Input label="Pickup address" error={errors.pickupAddress?.message} {...register('pickupAddress')} />
      <Input label="Destination" error={errors.dropoffAddress?.message} {...register('dropoffAddress')} />
      <Input
        label="Passengers"
        type="number"
        min={1}
        max={14}
        error={errors.passengers?.message}
        {...register('passengers', { valueAsNumber: true })}
      />
      <Input
        label="Flight number (optional)"
        placeholder="e.g. BA 117"
        error={errors.flightNumber?.message}
        {...register('flightNumber')}
      />
      <div className="space-y-1.5 text-left">
        <span className="text-xs font-medium uppercase tracking-wide text-velox-muted">Special requests</span>
        <textarea
          className="min-h-[96px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-0 transition placeholder:text-white/35 focus:border-velox-gold/60 focus:bg-white/10"
          placeholder="Luggage, child seat, preferred temperature..."
          {...register('specialRequests')}
        />
        {errors.specialRequests?.message ? (
          <span className="text-xs text-red-300">{errors.specialRequests.message}</span>
        ) : null}
      </div>
      <Button type="submit" className="w-full" isLoading={isSubmitting}>
        Continue to confirmation
      </Button>
    </form>
  )
}

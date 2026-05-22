import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useBookingStore } from '@/stores/bookingStore'
import type { UserProfile } from '@/types/user'
import { bookingContactSchema, type BookingContactValues } from '@/utils/validators'

type ContactStepProps = {
  profile: UserProfile | null
  defaultEmail: string | null
  onBack: () => void
  onContinue: (values: BookingContactValues) => Promise<void>
}

export function ContactStep(props: ContactStepProps) {
  const k = `${props.profile?.id ?? 'np'}-${props.defaultEmail ?? ''}`
  return <ContactStepFields key={k} {...props} />
}

function ContactStepFields({ profile, defaultEmail, onBack, onContinue }: ContactStepProps) {
  const fullName = useBookingStore((s) => s.fullName)
  const email = useBookingStore((s) => s.email)
  const phone = useBookingStore((s) => s.phone)
  const specialRequests = useBookingStore((s) => s.specialRequests)
  const saveToProfile = useBookingStore((s) => s.saveToProfile)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookingContactValues>({
    resolver: zodResolver(bookingContactSchema),
    defaultValues: {
      fullName: profile?.fullName?.trim() || fullName || '',
      email: defaultEmail ?? profile?.email ?? email ?? '',
      phone: profile?.phone?.trim() || phone || '',
      specialRequests: specialRequests || '',
      saveToProfile,
    },
  })

  useEffect(() => {
    reset({
      fullName: profile?.fullName?.trim() || fullName || '',
      email: defaultEmail ?? profile?.email ?? email ?? '',
      phone: profile?.phone?.trim() || phone || '',
      specialRequests: specialRequests || '',
      saveToProfile,
    })
    // Re-seed when signed-in identity or session email changes, not on every keystroke / store tick.
  }, [defaultEmail, profile?.id, reset])

  async function submit(values: BookingContactValues) {
    try {
      await onContinue(values)
    } catch (e) {
      setError('root', {
        message: e instanceof Error ? e.message : 'Something went wrong. Please try again.',
      })
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(submit)} noValidate>
      <p className="text-sm text-velox-muted">
        We use this for your receipt and day-of coordination. Use the email on this Velox VIP account (you can
        adjust it if needed).
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Input label="Full name" error={errors.fullName?.message} autoComplete="name" {...register('fullName')} />
        <Input label="Email" type="email" error={errors.email?.message} autoComplete="email" {...register('email')} />
      </div>
      <Input label="Phone" type="tel" error={errors.phone?.message} autoComplete="tel" {...register('phone')} />

      <div className="space-y-1.5 text-left">
        <span className="text-xs font-medium uppercase tracking-wide text-velox-muted">Special requests</span>
        <textarea
          className="min-h-[100px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-0 transition placeholder:text-white/35 focus:border-velox-gold/60 focus:bg-white/10"
          placeholder="Luggage, child seat, preferred temperature…"
          {...register('specialRequests')}
        />
        {errors.specialRequests?.message ? (
          <span className="text-xs text-red-300">{errors.specialRequests.message}</span>
        ) : null}
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <input type="checkbox" className="mt-1 accent-velox-gold" {...register('saveToProfile')} />
        <span>
          <span className="block text-sm font-medium text-white">Save to my profile</span>
          <span className="mt-0.5 block text-xs text-velox-muted">
            Keep this name and phone on your Velox VIP account for next time.
          </span>
        </span>
      </label>

      {errors.root?.message ? (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {errors.root.message}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-between gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Continue to payment
        </Button>
      </div>
    </form>
  )
}

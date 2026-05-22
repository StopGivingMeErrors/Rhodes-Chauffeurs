import { VehicleCard } from '@/components/booking/VehicleCard'
import { Spinner } from '@/components/ui/Spinner'
import { useBooking } from '@/hooks/useBooking'
import { isSupabaseConfigured } from '@/services/supabase'
import { cn } from '@/utils/cn'

/**
 * Landing page fleet: all vehicles marked available in admin (one card now, more when added).
 */
export function LandingFleetShowcase() {
  const { vehicles, isVehiclesLoading, vehiclesError } = useBooking()

  if (!isSupabaseConfigured) {
    return <p className="text-sm text-velox-muted">Connect Supabase to load fleet cards.</p>
  }

  if (isVehiclesLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner label="Loading fleet" />
      </div>
    )
  }

  if (vehiclesError) {
    return (
      <p className="text-sm text-red-200">
        {vehiclesError instanceof Error ? vehiclesError.message : 'Could not load vehicles.'}
      </p>
    )
  }

  if (vehicles.length === 0) {
    return (
      <p className="text-center text-sm text-velox-muted">
        Vehicle cards will appear here once added in the admin dashboard.
      </p>
    )
  }

  const single = vehicles.length === 1

  return (
    <div className={cn(single ? 'mx-auto max-w-md space-y-3' : 'space-y-6')}>
      {single ? (
        <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-velox-gold-light">
          Available now:
        </p>
      ) : null}
      <div
        className={cn(
          single
            ? ''
            : 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3',
        )}
      >
        {vehicles.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} />
        ))}
      </div>
    </div>
  )
}

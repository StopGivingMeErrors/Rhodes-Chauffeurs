import { useQuery } from '@tanstack/react-query'
import { MapPin, Sparkles } from 'lucide-react'
import { PickupScheduleControls } from '@/components/booking/wizard/PickupScheduleControls'
import { Spinner } from '@/components/ui/Spinner'
import { listActiveRoutes } from '@/services/routeService'
import { useBookingStore } from '@/stores/bookingStore'
import type { TransportRoute } from '@/types/route'
import { formatCurrencyMajor } from '@/utils/formatters'
import { formatRouteTierSummary, routePriceForPassengers } from '@/utils/routePricing'

type PopularRidesSectionProps = {
  onSelectRoute: (route: TransportRoute) => void
  selectedRouteId: string | null
}

export function PopularRidesSection({ onSelectRoute, selectedRouteId }: PopularRidesSectionProps) {
  const passengers = useBookingStore((s) => s.passengers)
  const { data: routes = [], isLoading, error } = useQuery({
    queryKey: ['routes', 'active'],
    queryFn: listActiveRoutes,
  })

  return (
    <div className="space-y-4">
      <PickupScheduleControls />
      <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-velox-gold-light">
        <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
        Fixed routes
      </div>
      <p className="text-xs text-white/50">
        All fixed routes use <span className="text-white/70">Lindos</span> as the starting base. Prices depend on
        guest count (1–4 or 5–8). The amount for your party is locked at checkout.
      </p>
      {isLoading ? <Spinner label="Loading routes" /> : null}
      {error ? (
        <p className="text-sm text-red-200">{error instanceof Error ? error.message : 'Could not load routes.'}</p>
      ) : null}
      <ul className="grid gap-3">
        {routes.map((route) => {
          const selected = selectedRouteId === route.id
          const yourPrice = routePriceForPassengers(route, passengers)
          const unitSuffix = route.pricingUnit === 'hour' ? '/hr' : ''
          return (
            <li key={route.id}>
              <button
                type="button"
                onClick={() => onSelectRoute(route)}
                className={`group w-full rounded-2xl border p-4 text-left transition ${
                  selected
                    ? 'border-emerald-400/55 bg-emerald-500/10 ring-1 ring-emerald-400/35'
                    : 'border-white/10 bg-white/[0.04] hover:border-velox-gold/40 hover:bg-white/[0.07]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-display text-base text-white group-hover:text-velox-gold-light">{route.title}</p>
                    <p className="text-xs text-white/50">{formatRouteTierSummary(route)}</p>
                    {route.subtitle ? <p className="text-xs text-white/40">{route.subtitle}</p> : null}
                    <p className="flex items-start gap-1.5 text-xs text-white/40">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-velox-gold-light/70" aria-hidden />
                      <span>{route.pickupAddress}</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-lg text-velox-gold-light">
                      {formatCurrencyMajor(yourPrice, 'EUR')}
                      {unitSuffix}
                    </p>
                    {selected ? (
                      <p className="text-[10px] uppercase tracking-wide text-emerald-300/80">Your party</p>
                    ) : null}
                  </div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

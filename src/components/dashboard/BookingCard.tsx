import type { BookingWithVehicle } from '@/types/booking'
import { AssignedDriverContact } from '@/components/dashboard/AssignedDriverContact'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { Button } from '@/components/ui/Button'
import { formatCurrencyMajor, formatDateTime } from '@/utils/formatters'
import { truncateMiddle } from '@/utils/text'
import { cn } from '@/utils/cn'

function pricePaidMajor(b: BookingWithVehicle): number | null {
  return b.finalPrice ?? b.estimatedPrice
}

type BookingCardProps = {
  booking: BookingWithVehicle
  onViewDetails: () => void
  onCancel?: () => void
  isCancelling?: boolean
}

export function BookingCard({ booking, onViewDetails, onCancel, isCancelling }: BookingCardProps) {
  const route = `${truncateMiddle(booking.pickupAddress, 26)} → ${truncateMiddle(booking.dropoffAddress, 26)}`
  const paid = pricePaidMajor(booking)
  const vehicleLabel = booking.vehicleName?.trim() || 'Vehicle'

  return (
    <article
      className={cn(
        'rounded-2xl border border-white/10 bg-white/[0.05] p-5 shadow-lg shadow-black/30 backdrop-blur-xl transition hover:border-white/15 hover:shadow-xl',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg text-white">{vehicleLabel}</p>
          <p className="mt-1 truncate text-xs text-velox-muted" title={`${booking.pickupAddress} → ${booking.dropoffAddress}`}>
            {route}
          </p>
          <p className="mt-2 text-sm text-white/80">{formatDateTime(booking.pickupDatetime)}</p>
        </div>
        <StatusBadge status={booking.status} />
      </div>
      {booking.driver && booking.driverId ? (
        <AssignedDriverContact driver={booking.driver} className="mt-4 border-t border-white/10 pt-4" />
      ) : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
        <span className="text-xs uppercase tracking-wide text-velox-muted">Price</span>
        <span className="font-display text-lg text-velox-gold-light">
          {paid != null ? formatCurrencyMajor(paid, booking.currency) : '—'}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" className="flex-1 sm:flex-none" onClick={onViewDetails}>
          View details
        </Button>
        {booking.status === 'pending' && onCancel ? (
          <Button type="button" variant="danger" size="sm" onClick={onCancel} isLoading={isCancelling}>
            Cancel
          </Button>
        ) : null}
      </div>
    </article>
  )
}

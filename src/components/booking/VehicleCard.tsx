import type { Vehicle } from '@/types/vehicle'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'

type VehicleCardProps = {
  vehicle: Vehicle
  className?: string
}

export function VehicleCard({ vehicle, className }: VehicleCardProps) {
  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-black/30 backdrop-blur-xl transition-[box-shadow,border-color] duration-300 hover:border-white/20 hover:shadow-xl',
        className,
      )}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-white/10">
        {vehicle.imageUrl ? (
          <img
            src={vehicle.imageUrl}
            alt={vehicle.name}
            className="h-full w-full object-cover transition duration-500 hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-white/[0.03] text-xs text-velox-muted">
            Add a photo in admin
          </div>
        )}
        <div className="absolute left-3 top-3">
          <Badge tone="neutral" className="border-white/20 bg-black/40 text-[11px] text-white/90 backdrop-blur-md">
            {vehicle.capacity} seats
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="font-display text-lg leading-tight text-white">{vehicle.name}</h3>
        {vehicle.description ? (
          <p className="mt-2 flex-1 text-sm leading-relaxed text-white/65">{vehicle.description}</p>
        ) : (
          <p className="mt-2 text-sm text-white/40">Description coming soon.</p>
        )}
      </div>
    </article>
  )
}

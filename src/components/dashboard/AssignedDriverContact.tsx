import { Phone, User } from 'lucide-react'
import type { AssignedDriver } from '@/types/booking'
import { cn } from '@/utils/cn'

type AssignedDriverContactProps = {
  driver: AssignedDriver
  className?: string
}

export function AssignedDriverContact({ driver, className }: AssignedDriverContactProps) {
  const tel = driver.phone?.replace(/\s/g, '') ?? ''

  return (
    <section className={cn(className)} aria-label="Assigned chauffeur">
      <p className="text-xs font-medium uppercase tracking-wider text-velox-gold/90">Your chauffeur</p>
      <div className="mt-2 flex flex-col gap-2 rounded-xl border border-velox-gold/25 bg-velox-gold/5 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-medium text-white">
          <User className="h-4 w-4 shrink-0 text-velox-gold/80" aria-hidden />
          {driver.fullName}
        </p>
        {driver.phone ? (
          <a
            href={`tel:${tel}`}
            className="flex items-center gap-2 text-sm text-velox-gold-light transition hover:text-white"
          >
            <Phone className="h-4 w-4 shrink-0" aria-hidden />
            {driver.phone}
          </a>
        ) : (
          <p className="text-xs text-velox-muted">Direct phone will be shared shortly.</p>
        )}
      </div>
    </section>
  )
}

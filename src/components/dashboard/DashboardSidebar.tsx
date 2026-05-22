import { CalendarRange, CarFront, LogOut, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/utils/constants'
import { cn } from '@/utils/cn'

export type DashboardSection = 'bookings' | 'profile'

type DashboardSidebarProps = {
  section: DashboardSection
  onSection: (s: DashboardSection) => void
}

export function DashboardSidebar({ section, onSection }: DashboardSidebarProps) {
  const { signOut, isSigningOut } = useAuth()

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-white/10 bg-zinc-950/55 px-4 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl lg:w-60 lg:min-h-0 lg:border-b-0 lg:border-r lg:px-5">
      <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-velox-muted">Menu</p>
      <nav className="mt-4 flex min-h-0 flex-1 flex-row gap-2 overflow-x-auto lg:flex-col lg:gap-1" aria-label="Dashboard sections">
        <button
          type="button"
          onClick={() => onSection('bookings')}
          aria-current={section === 'bookings' ? 'page' : undefined}
          aria-label="View my bookings"
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition',
            section === 'bookings'
              ? 'border border-velox-gold/35 bg-velox-gold/10 text-velox-gold-light'
              : 'border border-transparent text-white/70 hover:bg-white/5 hover:text-white',
          )}
        >
          <CalendarRange className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          My Bookings
        </button>
        <Link
          to={ROUTES.book}
          aria-label="Start a new booking"
          className="flex shrink-0 items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
        >
          <CarFront className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          New Booking
        </Link>
        <button
          type="button"
          onClick={() => onSection('profile')}
          aria-current={section === 'profile' ? 'page' : undefined}
          aria-label="Edit profile"
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition',
            section === 'profile'
              ? 'border border-velox-gold/35 bg-velox-gold/10 text-velox-gold-light'
              : 'border border-transparent text-white/70 hover:bg-white/5 hover:text-white',
          )}
        >
          <UserRound className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          Profile
        </button>
      </nav>
      <div className="mt-6 border-t border-white/10 pt-4 lg:mt-auto">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-2 text-white/60 hover:text-white"
          isLoading={isSigningOut}
          leftIcon={<LogOut className="h-4 w-4" />}
          onClick={() => {
            void signOut()
          }}
        >
          Sign Out
        </Button>
      </div>
    </aside>
  )
}

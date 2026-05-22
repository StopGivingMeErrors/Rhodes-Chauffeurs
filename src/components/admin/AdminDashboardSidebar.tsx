import type { ReactNode } from 'react'
import { Car, LayoutGrid, LogOut, MapPinned, Table2, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/utils/cn'

export type AdminSection = 'overview' | 'bookings' | 'routes' | 'fleet' | 'drivers'

type AdminDashboardSidebarProps = {
  section: AdminSection
  onSection: (s: AdminSection) => void
}

export function AdminDashboardSidebar({ section, onSection }: AdminDashboardSidebarProps) {
  const { signOut, isSigningOut } = useAuth()

  const items: { id: AdminSection; label: string; icon: ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutGrid className="h-4 w-4 shrink-0 opacity-80" aria-hidden /> },
    { id: 'bookings', label: 'All Bookings', icon: <Table2 className="h-4 w-4 shrink-0 opacity-80" aria-hidden /> },
    { id: 'routes', label: 'Routes & pricing', icon: <MapPinned className="h-4 w-4 shrink-0 opacity-80" aria-hidden /> },
    { id: 'fleet', label: 'Landing vehicles', icon: <Car className="h-4 w-4 shrink-0 opacity-80" aria-hidden /> },
    { id: 'drivers', label: 'Drivers', icon: <Users className="h-4 w-4 shrink-0 opacity-80" aria-hidden /> },
  ]

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-white/10 bg-zinc-950/55 px-4 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl lg:w-60 lg:min-h-0 lg:border-b-0 lg:border-r lg:px-5">
      <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-velox-muted">Admin</p>
      <nav className="mt-4 flex min-h-0 flex-1 flex-row gap-2 overflow-x-auto lg:flex-col lg:gap-1" aria-label="Admin sections">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSection(item.id)}
            aria-current={section === item.id ? 'page' : undefined}
            aria-label={item.label}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition',
              section === item.id
                ? 'border border-velox-gold/35 bg-velox-gold/10 text-velox-gold-light'
                : 'border border-transparent text-white/70 hover:bg-white/5 hover:text-white',
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
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

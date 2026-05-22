import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Shield, CarFront, Home } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/utils/constants'
import { cn } from '@/utils/cn'

type NavItem = {
  to: string
  label: string
  icon: ReactNode
}

export function Sidebar() {
  const { isAdmin, isClient } = useAuth()

  const items: NavItem[] = [
    { to: ROUTES.home, label: 'Overview', icon: <Home className="h-4 w-4" /> },
    ...(isClient ? [{ to: ROUTES.dashboard, label: 'My trips', icon: <LayoutDashboard className="h-4 w-4" /> }] : []),
    { to: ROUTES.book, label: 'New booking', icon: <CarFront className="h-4 w-4" /> },
    ...(isAdmin ? [{ to: ROUTES.admin, label: 'Command', icon: <Shield className="h-4 w-4" /> }] : []),
  ]

  return (
    <aside className="hidden w-56 shrink-0 border-r border-white/10 bg-velox-midnight/40 p-4 backdrop-blur-xl lg:block">
      <p className="px-2 text-xs font-semibold uppercase tracking-wide text-velox-muted">Navigate</p>
      <nav className="mt-4 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white',
                isActive && 'border border-velox-gold/30 bg-velox-gold/10 text-velox-gold-light',
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

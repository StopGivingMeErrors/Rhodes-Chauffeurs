import { NavLink } from 'react-router-dom'
import { Crown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { APP_NAME, APP_TAGLINE, ROUTES } from '@/utils/constants'
import { cn } from '@/utils/cn'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'text-sm text-white/70 transition hover:text-white',
    isActive && 'text-velox-gold-light',
  )

export function Navbar() {
  const { isAuthenticated, isAdmin, isClient, signOut, isSigningOut } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-velox-midnight/70 backdrop-blur-xl" role="banner">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <NavLink to={ROUTES.home} className="flex items-center gap-2" aria-label={`${APP_NAME} home`}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-velox-gold/40 bg-velox-gold/10 text-velox-gold-light">
            <Crown className="h-5 w-5" aria-hidden />
          </span>
          <div className="text-left leading-tight">
            <p className="font-display text-lg text-white">{APP_NAME}</p>
            <p className="max-w-[11rem] text-[10px] leading-snug text-velox-muted sm:max-w-none sm:text-xs">
              {APP_TAGLINE}
            </p>
          </div>
        </NavLink>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary navigation">
          <NavLink to={ROUTES.home} className={linkClass}>
            Home
          </NavLink>
          <NavLink to={ROUTES.book} className={linkClass}>
            Book
          </NavLink>
          {isAuthenticated && isClient ? (
            <NavLink to={ROUTES.dashboard} className={linkClass}>
              Dashboard
            </NavLink>
          ) : null}
          {isAuthenticated && isAdmin ? (
            <NavLink to={ROUTES.admin} className={linkClass}>
              Admin
            </NavLink>
          ) : null}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Button
              variant="secondary"
              isLoading={isSigningOut}
              aria-label="Sign out of your account"
              onClick={() => {
                void signOut()
              }}
            >
              Sign out
            </Button>
          ) : (
            <Button to={ROUTES.login} variant="primary" aria-label="Go to client login">
              Client login
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/utils/constants'

type ProtectedRouteProps = {
  /** Only users with `profiles.role === 'admin'`. */
  requireAdmin?: boolean
  /** Only users with `profiles.role === 'client'`. */
  requireClient?: boolean
}

export function ProtectedRoute({ requireAdmin, requireClient }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isAdmin, isClient } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <Spinner label="Checking session" className="min-h-[50vh]" />
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to={isClient ? ROUTES.dashboard : ROUTES.home} replace />
  }

  if (requireClient && !isClient) {
    if (isAdmin) {
      return <Navigate to={ROUTES.admin} replace />
    }
    return <Navigate to={ROUTES.home} replace />
  }

  return <Outlet />
}

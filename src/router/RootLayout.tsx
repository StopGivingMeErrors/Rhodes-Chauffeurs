import { Outlet } from 'react-router-dom'
import { AuthBootstrap } from '@/components/layout/AuthBootstrap'
import { CookieConsent } from '@/components/layout/CookieConsent'
import { RouteProgressBar } from '@/components/layout/RouteProgressBar'

export function RootLayout() {
  return (
    <>
      <AuthBootstrap />
      <RouteProgressBar />
      <Outlet />
      <CookieConsent />
    </>
  )
}

import { Suspense } from 'react'
import { PageErrorBoundary } from '@/components/layout/PageErrorBoundary'
import {
  AdminDashboardSkeleton,
  BookingPageSkeleton,
  ConfirmationPageSkeleton,
  DashboardSkeleton,
  LandingSkeleton,
  LoginPageSkeleton,
} from '@/components/layout/PageSkeletons'
import {
  LazyAdminDashboard,
  LazyBookingPage,
  LazyConfirmationPage,
  LazyDashboard,
  LazyLandingPage,
  LazyLoginPage,
  LazyPrivacyPage,
  LazyTermsPage,
} from '@/router/lazyPages'

export function HomeRoute() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<LandingSkeleton />}>
        <LazyLandingPage />
      </Suspense>
    </PageErrorBoundary>
  )
}

export function BookRoute() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<BookingPageSkeleton />}>
        <LazyBookingPage />
      </Suspense>
    </PageErrorBoundary>
  )
}

export function ConfirmationRoute() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<ConfirmationPageSkeleton />}>
        <LazyConfirmationPage />
      </Suspense>
    </PageErrorBoundary>
  )
}

export function LoginRoute() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<LoginPageSkeleton />}>
        <LazyLoginPage />
      </Suspense>
    </PageErrorBoundary>
  )
}

export function DashboardRoute() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<DashboardSkeleton />}>
        <LazyDashboard />
      </Suspense>
    </PageErrorBoundary>
  )
}

export function AdminRoute() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<AdminDashboardSkeleton />}>
        <LazyAdminDashboard />
      </Suspense>
    </PageErrorBoundary>
  )
}

export function PrivacyRoute() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<LandingSkeleton />}>
        <LazyPrivacyPage />
      </Suspense>
    </PageErrorBoundary>
  )
}

export function TermsRoute() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<LandingSkeleton />}>
        <LazyTermsPage />
      </Suspense>
    </PageErrorBoundary>
  )
}

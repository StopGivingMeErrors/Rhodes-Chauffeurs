import { useState } from 'react'
import { DashboardSidebar, type DashboardSection } from '@/components/dashboard/DashboardSidebar'
import { MyBookingsPanel } from '@/components/dashboard/MyBookingsPanel'
import { ProfilePanel } from '@/components/dashboard/ProfilePanel'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useAuth } from '@/hooks/useAuth'
import { usePageMeta } from '@/hooks/usePageMeta'

export function Dashboard() {
  usePageMeta({
    title: 'My trips',
    description: 'View upcoming and past Velox VIP bookings, update your profile, and manage reservations.',
  })
  const { profile } = useAuth()
  const [section, setSection] = useState<DashboardSection>('bookings')

  return (
    <PageWrapper variant="dashboard" className="min-h-0">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <DashboardSidebar section={section} onSection={setSection} />
        <div className="flex min-w-0 flex-1 flex-col px-4 py-8 lg:px-10 lg:py-10">
          <header className="mb-8 border-b border-white/10 pb-6">
            <h1 className="font-display text-3xl text-white sm:text-4xl">Dashboard</h1>
            <p className="mt-2 text-sm text-velox-muted sm:text-base">
              {section === 'bookings'
                ? 'Your reservations, live from Supabase.'
                : 'Keep your contact details current.'}
              {profile?.fullName ? (
                <span className="mt-1 block text-white/70">Signed in as {profile.fullName}</span>
              ) : null}
            </p>
          </header>
          {section === 'bookings' ? <MyBookingsPanel /> : <ProfilePanel />}
        </div>
      </div>
    </PageWrapper>
  )
}

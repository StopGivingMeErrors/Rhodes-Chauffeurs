import { useState } from 'react'
import { AdminBookingsPanel } from '@/components/admin/AdminBookingsPanel'
import { AdminCommandCenterDateBar } from '@/components/admin/AdminCommandCenterDateBar'
import { AdminDashboardSidebar, type AdminSection } from '@/components/admin/AdminDashboardSidebar'
import { AdminOpsDigitalClock } from '@/components/admin/AdminOpsDigitalClock'
import { AdminDriversPanel } from '@/components/admin/AdminDriversPanel'
import { AdminFleetPanel } from '@/components/admin/AdminFleetPanel'
import { AdminRoutesPanel } from '@/components/admin/AdminRoutesPanel'
import { AdminOverviewPanel } from '@/components/admin/AdminOverviewPanel'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card } from '@/components/ui/Card'
import { usePageMeta } from '@/hooks/usePageMeta'
import { isSupabaseConfigured } from '@/services/supabase'

export function AdminDashboard() {
  usePageMeta({
    title: 'Admin command center',
    description: 'Operations dashboard for Velox VIP: KPIs, bookings, fleet, and driver roster.',
  })
  const [section, setSection] = useState<AdminSection>('overview')

  if (!isSupabaseConfigured) {
    return (
      <PageWrapper variant="dashboard" className="min-h-0">
        <div className="flex min-h-0 flex-1 flex-col px-4 py-10 lg:px-10">
          <header className="mb-8 border-b border-white/10 pb-6">
            <h1 className="font-display text-3xl text-white sm:text-4xl">Admin</h1>
            <p className="mt-2 text-sm text-velox-muted sm:text-base">Connect Supabase to load operational data.</p>
          </header>
          <Card title="Supabase required">
            <p className="text-sm text-velox-muted">Configure environment variables before opening the command center.</p>
          </Card>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper variant="dashboard" className="min-h-0">
      <AdminCommandCenterDateBar />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <AdminDashboardSidebar section={section} onSection={setSection} />
        <div className="flex min-w-0 flex-1 flex-col px-4 py-8 lg:px-10 lg:py-10">
          <header className="mb-8 border-b border-white/10 pb-6">
            <h1 className="font-display text-3xl text-white sm:text-4xl">Command center</h1>
            <p className="mt-2 text-sm text-velox-muted sm:text-base">
              {section === 'overview' && 'Live KPIs from your bookings ledger.'}
              {section === 'bookings' && 'Dispatch table with filters, sorting, and realtime sync.'}
              {section === 'routes' && 'Fixed route prices shown to guests at checkout.'}
              {section === 'fleet' && 'Landing page vehicle cards — title, description, and photo.'}
              {section === 'drivers' && 'Company chauffeur roster (name, email, phone) — not app users.'}
            </p>
          </header>
          {section === 'overview' ? <AdminOverviewPanel /> : null}
          {section === 'bookings' ? (
            <>
              <AdminOpsDigitalClock />
              <AdminBookingsPanel />
            </>
          ) : null}
          {section === 'routes' ? <AdminRoutesPanel /> : null}
          {section === 'fleet' ? <AdminFleetPanel /> : null}
          {section === 'drivers' ? <AdminDriversPanel /> : null}
        </div>
      </div>
    </PageWrapper>
  )
}

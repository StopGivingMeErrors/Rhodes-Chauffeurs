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
import { APP_NAME } from '@/utils/constants'

export function AdminDashboard() {
  usePageMeta({
    title: 'Διαχείριση',
    description: `Πίνακας λειτουργίας ${APP_NAME}: KPI, κρατήσεις, στόλος και οδηγοί.`,
  })
  const [section, setSection] = useState<AdminSection>('overview')

  if (!isSupabaseConfigured) {
    return (
      <PageWrapper variant="dashboard" className="min-h-0">
        <div className="flex min-h-0 flex-1 flex-col px-4 py-10 lg:px-10">
          <header className="mb-8 border-b border-white/10 pb-6">
            <h1 className="font-display text-3xl text-white sm:text-4xl">Διαχείριση</h1>
            <p className="mt-2 text-sm text-velox-muted sm:text-base">Συνδέστε το Supabase για φόρτωση δεδομένων.</p>
          </header>
          <Card title="Απαιτείται Supabase">
            <p className="text-sm text-velox-muted">Ρυθμίστε τις μεταβλητές περιβάλλοντος πριν ανοίξετε το κέντρο ελέγχου.</p>
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
            <h1 className="font-display text-3xl text-white sm:text-4xl">Κέντρο ελέγχου</h1>
            <p className="mt-2 text-sm text-velox-muted sm:text-base">
              {section === 'overview' && 'Ζωντανά KPI από το βιβλίο κρατήσεων.'}
              {section === 'bookings' && 'Πίνακας αναθέσεων με φίλτρα, ταξινόμηση και ενημέρωση σε πραγματικό χρόνο.'}
              {section === 'routes' && 'Σταθερές διαδρομές και τιμές που βλέπουν οι πελάτες.'}
              {section === 'fleet' && 'Κάρτες οχημάτων στην αρχική σελίδα — τίτλος, περιγραφή, φωτογραφία.'}
              {section === 'drivers' && 'Εσωτερικό roster οδηγών (όνομα, email, τηλέφωνο) — όχι λογαριασμοί εφαρμογής.'}
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

import { Link } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { usePageMeta } from '@/hooks/usePageMeta'
import { APP_NAME, APP_SITE_URL, ROUTES } from '@/utils/constants'

export function PrivacyPage() {
  usePageMeta({ title: 'Privacy Policy' })

  return (
    <PageWrapper>
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
        <p className="text-xs uppercase tracking-widest text-velox-gold/90">Legal</p>
        <h1 className="mt-2 font-display text-3xl text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm text-velox-muted">Last updated: May 2026</p>

        <div className="prose-invert mt-10 space-y-6 text-sm leading-relaxed text-white/80">
          <section>
            <h2 className="font-display text-lg text-white">Who we are</h2>
            <p className="mt-2">
              {APP_NAME} operates this booking platform for chauffeured transport at{' '}
              <a href={APP_SITE_URL} className="text-velox-gold-light hover:underline">
                rodoschauffeurs.gr
              </a>
              . We process personal data as a data controller when you create an account, make a reservation, or
              contact us.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg text-white">Data we collect</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Identity and contact details (name, email, phone)</li>
              <li>Booking details (addresses, dates, flight numbers, special requests)</li>
              <li>Payment status via Stripe (we do not store full card numbers)</li>
              <li>Technical logs (IP, browser) for security and fraud prevention</li>
            </ul>
          </section>
          <section>
            <h2 className="font-display text-lg text-white">Legal bases (GDPR)</h2>
            <p className="mt-2">
              We process data to perform our contract with you (providing transport), for legitimate interests (operations,
              security), and where required by law. Marketing emails require your consent where applicable.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg text-white">Sharing</h2>
            <p className="mt-2">
              We use trusted processors: Supabase (hosting and database), Stripe (payments), Resend (transactional email),
              and map providers for routing. Chauffeur contact details are shared with you only after a driver is assigned
              to your booking.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg text-white">Retention & rights</h2>
            <p className="mt-2">
              We retain booking records as needed for operations, tax, and legal obligations. You may request access,
              correction, deletion, or restriction by contacting us. EU/EEA users may lodge a complaint with their supervisory
              authority.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg text-white">Contact</h2>
            <p className="mt-2">
              For privacy requests, email your concierge or the address published on your booking confirmation.
            </p>
          </section>
        </div>

        <p className="mt-12 text-sm text-velox-muted">
          <Link to={ROUTES.home} className="text-velox-gold-light hover:underline">
            ← Back to home
          </Link>
        </p>
      </article>
    </PageWrapper>
  )
}

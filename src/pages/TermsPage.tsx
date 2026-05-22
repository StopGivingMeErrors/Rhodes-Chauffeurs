import { Link } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { usePageMeta } from '@/hooks/usePageMeta'
import { APP_NAME, ROUTES } from '@/utils/constants'

export function TermsPage() {
  usePageMeta({ title: `Terms of Service · ${APP_NAME}` })

  return (
    <PageWrapper>
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
        <p className="text-xs uppercase tracking-widest text-velox-gold/90">Legal</p>
        <h1 className="mt-2 font-display text-3xl text-white">Terms of Service</h1>
        <p className="mt-2 text-sm text-velox-muted">Last updated: May 2026</p>

        <div className="mt-10 space-y-6 text-sm leading-relaxed text-white/80">
          <section>
            <h2 className="font-display text-lg text-white">Bookings</h2>
            <p className="mt-2">
              A reservation is confirmed when accepted by {APP_NAME} operations and, where applicable, payment is completed.
              You must provide accurate pickup details and arrive on time. Waiting time may incur additional charges per our
              rate card.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg text-white">Cancellations & refunds</h2>
            <p className="mt-2">
              Cancellation terms depend on notice given before pickup. Card payments are processed by Stripe; refunds, when
              due, are issued to the original payment method. Cash bookings are settled directly with your chauffeur as agreed.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg text-white">Conduct</h2>
            <p className="mt-2">
              We may refuse service for safety, illegal activity, or abuse of staff. Smoking and excess luggage may be
              restricted per vehicle class.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg text-white">Liability</h2>
            <p className="mt-2">
              To the extent permitted by law, our liability is limited to the fees paid for the affected trip. Nothing in
              these terms excludes liability that cannot be excluded under applicable consumer law.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg text-white">Governing law</h2>
            <p className="mt-2">
              These terms are governed by the laws applicable to the operating entity shown on your invoice, without prejudice
              to mandatory consumer protections in your country of residence.
            </p>
          </section>
        </div>

        <p className="mt-12 text-sm text-velox-muted">
          <Link to={ROUTES.home} className="text-velox-gold-light hover:underline">
            ← Back to home
          </Link>
          {' · '}
          <Link to={ROUTES.privacy} className="text-velox-gold-light hover:underline">
            Privacy Policy
          </Link>
        </p>
      </article>
    </PageWrapper>
  )
}

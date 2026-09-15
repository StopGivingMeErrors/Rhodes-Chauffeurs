import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  Car,
  MapPin,
  Sparkles,
} from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { LandingFleetShowcase } from '@/components/booking/LandingFleetShowcase'
import { Button } from '@/components/ui/Button'
import { usePageMeta } from '@/hooks/usePageMeta'
import { APP_NAME, APP_SITE_HOST, APP_SITE_URL, APP_TAGLINE, ROUTES } from '@/utils/constants'
import { cn } from '@/utils/cn'

const bento = [
  {
    title: 'Airport to anywhere',
    body: 'Rhodes Airport pickups timed to your flight — calm doors, no guesswork.',
    icon: MapPin,
    className: 'sm:col-span-2 sm:row-span-2',
    large: true,
  },
  {
    title: 'Lindos routes',
    body: 'Published fares. Clear pricing before you confirm.',
    icon: Sparkles,
    className: '',
    large: false,
  },
  {
    title: 'Custom itineraries',
    body: 'Hotels, villages, and island days — planned around you.',
    icon: Car,
    className: '',
    large: false,
  },
  {
    title: 'On-time arrivals',
    body: 'Traffic-aware chauffeurs who adjust when your plans shift.',
    icon: CalendarClock,
    className: 'sm:col-span-2',
    large: false,
  },
] as const

const steps = [
  {
    step: '1',
    title: 'Choose your route',
    body: 'Fixed Lindos transfer or a custom itinerary built for your day.',
  },
  {
    step: '2',
    title: 'Confirm your details',
    body: 'Share pickup, guests, and flight — then reserve your chauffeur.',
  },
  {
    step: '3',
    title: 'Travel with ease',
    body: 'Meet your driver on time and enjoy a quiet, private ride.',
  },
] as const

export function LandingPage() {
  usePageMeta({
    title: 'VIP transfers in Rhodes',
    description:
      'Rhodes Chauffeurs — VIP transfers and chauffeur services across Rhodes. Fixed Lindos routes or custom itineraries with cash to your chauffeur.',
  })

  return (
    <PageWrapper variant="landing">
      {/* Hero — one composition: brand, headline, line, CTAs */}
      <section className="relative flex min-h-[min(100dvh,880px)] flex-col justify-end overflow-hidden px-4 pb-16 pt-24 sm:px-8 sm:pb-24 lg:px-12 lg:pb-28">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 100% 80% at 50% -20%, rgba(232,201,122,0.18), transparent 55%), radial-gradient(ellipse 60% 50% at 85% 60%, rgba(201,168,76,0.08), transparent 50%), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(255,255,255,0.04), transparent 45%), linear-gradient(180deg, #0a0a0f 0%, #0c0c14 45%, #0a0a0f 100%)',
            animation: 'velox-aurora 22s ease-in-out infinite',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)',
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-velox-void to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-5xl text-center">
          <p
            className="font-display text-[clamp(2.75rem,8vw,5.5rem)] font-medium leading-[0.95] tracking-tight text-white"
            style={{ animation: 'velox-booking-step-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both' }}
          >
            {APP_NAME}
          </p>
          <h1
            className="mx-auto mt-6 max-w-2xl text-balance text-lg font-medium leading-snug text-white/85 sm:text-xl sm:leading-relaxed"
            style={{ animation: 'velox-booking-step-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both' }}
          >
            Private chauffeur transfers across Rhodes — airport, Lindos, and beyond.
          </h1>
          <p
            className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/55 sm:text-base"
            style={{ animation: 'velox-booking-step-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.14s both' }}
          >
            Clear routes. Punctual drivers. A quieter way to arrive.
          </p>
          <div
            className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
            style={{ animation: 'velox-booking-step-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both' }}
          >
            <Button to={ROUTES.book} size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
              Book a ride
            </Button>
            <Button to={ROUTES.login} variant="secondary" size="lg">
              Client login
            </Button>
          </div>
        </div>
      </section>

      {/* Bento — qualitative, no fake metrics */}
      <section className="relative px-4 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-velox-gold-light/80">
              Designed for the island
            </p>
            <h2 className="mt-3 font-display text-3xl tracking-tight text-white sm:text-4xl">
              Everything you need. Nothing you don’t.
            </h2>
          </div>

          <div className="mt-12 grid auto-rows-[minmax(11rem,auto)] gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {bento.map(({ title, body, icon: Icon, className, large }) => (
              <article
                key={title}
                className={cn(
                  'group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-white/[0.035] p-6 transition duration-500 ease-out hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.055] sm:p-7',
                  className,
                )}
              >
                <div
                  className={cn(
                    'pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-velox-gold/10 blur-3xl transition duration-700 group-hover:bg-velox-gold/20',
                    large && 'h-48 w-48',
                  )}
                />
                <div className="relative">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-velox-gold-light">
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <h3
                    className={cn(
                      'mt-5 font-display tracking-tight text-white',
                      large ? 'text-2xl sm:text-3xl' : 'text-xl',
                    )}
                  >
                    {title}
                  </h3>
                  <p
                    className={cn(
                      'mt-2 leading-relaxed text-white/55',
                      large ? 'max-w-sm text-base' : 'text-sm',
                    )}
                  >
                    {body}
                  </p>
                </div>
                {large ? (
                  <div className="relative mt-8">
                    <Button to={ROUTES.book} variant="secondary" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                      Start booking
                    </Button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Fleet */}
      <section className="border-y border-white/[0.06] bg-black/25 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 lg:px-12">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-lg">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-velox-gold-light/80">
                The fleet
              </p>
              <h2 className="mt-3 font-display text-3xl tracking-tight text-white sm:text-4xl">
                Quiet luxury on wheels
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/55">
                Maintained for VIP transfers and island days — space for guests, luggage, and a calm ride.
              </p>
            </div>
            <Button to={ROUTES.book} variant="ghost" className="text-velox-gold-light" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Book now
            </Button>
          </div>
          <div className="mt-12">
            <LandingFleetShowcase />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-velox-gold-light/80">
              How it works
            </p>
            <h2 className="mt-3 font-display text-3xl tracking-tight text-white sm:text-4xl">
              Three simple steps
            </h2>
          </div>

          <ol className="mt-14 grid gap-3 sm:grid-cols-3 sm:gap-4">
            {steps.map(({ step, title, body }) => (
              <li
                key={step}
                className="relative rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-transparent px-6 py-8 text-left transition duration-500 hover:border-white/14"
              >
                <span className="font-display text-5xl font-medium leading-none text-velox-gold/25">{step}</span>
                <h3 className="mt-5 font-display text-xl text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-4 pb-20 sm:px-8 lg:px-12">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-white/[0.08] px-6 py-16 text-center sm:px-12 sm:py-20">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 80% 70% at 50% 0%, rgba(201,168,76,0.16), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.04), transparent)',
            }}
          />
          <div className="relative z-10">
            <h2 className="font-display text-3xl tracking-tight text-white sm:text-4xl">
              Ready when you are
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/55 sm:text-base">
              Reserve your transfer in a few taps — we’ll take care of the rest.
            </p>
            <div className="mt-8">
              <Button to={ROUTES.book} size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
                Book a ride
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer — honest, no fake stats or phone */}
      <footer className="mt-auto border-t border-white/[0.06] py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 px-4 text-center sm:flex-row sm:px-8 sm:text-left lg:px-12">
          <div>
            <p className="font-display text-lg text-white">{APP_NAME}</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-white/45">{APP_TAGLINE}</p>
            <a
              href={APP_SITE_URL}
              className="mt-2 inline-block text-xs text-velox-gold-light/80 transition hover:text-velox-gold-light"
            >
              {APP_SITE_HOST}
            </a>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/45">
            <Link className="transition hover:text-white" to={ROUTES.book}>
              Book
            </Link>
            <Link className="transition hover:text-white" to={ROUTES.login}>
              Login
            </Link>
            <Link className="transition hover:text-white" to={ROUTES.privacy}>
              Privacy
            </Link>
            <Link className="transition hover:text-white" to={ROUTES.terms}>
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </PageWrapper>
  )
}

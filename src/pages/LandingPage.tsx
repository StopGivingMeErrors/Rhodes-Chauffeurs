import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  Headphones,
  MapPin,
  Shield,
  Sparkles,
  Star,
} from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { LandingFleetShowcase } from '@/components/booking/LandingFleetShowcase'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { usePageMeta } from '@/hooks/usePageMeta'
import { ROUTES } from '@/utils/constants'

const steps = [
  {
    step: '01',
    title: 'Choose your route',
    body: 'Pick a fixed Lindos route or request a custom itinerary — pricing follows your guest count.',
    icon: Sparkles,
  },
  {
    step: '02',
    title: 'Confirm & pay securely',
    body: 'Review your itinerary, then checkout with Stripe—your card never touches our servers.',
    icon: Shield,
  },
  {
    step: '03',
    title: 'Ride in calm',
    body: 'A vetted chauffeur arrives on time, monitors traffic, and adapts to your schedule.',
    icon: CalendarClock,
  },
] as const

const stats = [
  { value: '500+', label: 'Private clients served' },
  { value: '50+', label: 'Cities & airports' },
  { value: '24/7', label: 'Concierge support' },
] as const

export function LandingPage() {
  usePageMeta({
    title: 'Luxury chauffeur service',
    description:
      'Book Mercedes-Maybach, Range Rover, V-Class, and Sprinter transport with transparent pricing and Stripe checkout.',
  })
  return (
    <PageWrapper variant="landing">
      {/* Hero */}
      <section className="relative flex min-h-[min(100dvh,920px)] flex-col justify-center overflow-hidden px-4 pb-20 pt-8 sm:px-8 lg:px-12">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-10%,rgba(201,168,76,0.14),transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_50%,rgba(99,102,241,0.06),transparent_50%),radial-gradient(ellipse_60%_45%_at_0%_100%,rgba(201,168,76,0.08),transparent_45%)]"
          style={{ animation: 'velox-aurora 22s ease-in-out infinite' }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-velox-void/40 to-velox-void" />

        <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-velox-gold-light/90">
              Velox VIP
            </p>
            <h1 className="mt-6 font-display text-[clamp(2.5rem,6vw,4.25rem)] font-medium leading-[1.05] tracking-tight text-white">
              Arrive in Silence.
              <br />
              <span className="bg-gradient-to-r from-velox-gold-light via-velox-gold to-[#8f7535] bg-clip-text text-transparent">
                Depart in Style.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
              Discrete chauffeured transport for executives, dignitaries, and guests who expect punctuality,
              privacy, and a perfectly composed arrival—every time.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button to={ROUTES.book} size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
                Book a Ride
              </Button>
              <Button to={ROUTES.login} variant="secondary" size="lg">
                Client login
              </Button>
            </div>
          </div>

          <Card
            hoverGlow
            className="relative border-white/10 bg-white/[0.06] p-8 shadow-2xl shadow-black/50 lg:p-10"
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-velox-gold/10 blur-2xl" />
            <p className="text-xs font-semibold uppercase tracking-widest text-velox-gold-light">Quick path</p>
            <p className="mt-3 font-display text-2xl text-white">Reserve in under a minute</p>
            <p className="mt-2 text-sm text-velox-muted">
              Choose a route, share pickup details, and confirm online or pay your chauffeur in cash for custom trips.
            </p>
            <div className="mt-8 flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
              <MapPin className="h-4 w-4 shrink-0 text-velox-gold-light" aria-hidden />
              <span>Airport, hotel, or door-to-door—wherever the evening takes you.</span>
            </div>
            <div className="mt-6">
              <Button to={ROUTES.book} className="w-full" size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
                Book a Ride
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Fleet */}
      <section className="border-t border-white/5 bg-black/20 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 lg:px-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-velox-gold-light">The fleet</p>
              <h2 className="mt-2 font-display text-3xl text-white sm:text-4xl">Our vehicles</h2>
              <p className="mt-2 max-w-lg text-sm text-velox-muted">
                Premium chauffeur transport for Rhodes — maintained to VIP standards for transfers and island tours.
              </p>
            </div>
            <Button to={ROUTES.book} variant="ghost" className="text-velox-gold-light" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Book now
            </Button>
          </div>

          <div className="mt-10">
            <LandingFleetShowcase />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 lg:px-12">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-velox-gold-light">
            How it works
          </p>
          <h2 className="mt-2 text-center font-display text-3xl text-white sm:text-4xl">Three quiet steps</h2>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map(({ step, title, body, icon: Icon }) => (
              <Card
                key={step}
                hoverGlow
                className="relative flex flex-col border-white/10 bg-white/[0.04] p-8 text-left"
              >
                <span className="font-display text-5xl font-medium leading-none text-white/[0.08]">{step}</span>
                <div className="mt-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-velox-gold/30 bg-velox-gold/10 text-velox-gold-light">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-5 font-display text-xl text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-velox-muted">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-y border-white/5 bg-white/[0.02] py-16">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-12 px-4 sm:gap-20 sm:px-8 lg:px-12">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="font-display text-4xl font-medium text-velox-gold-light sm:text-5xl">{value}</p>
              <p className="mt-2 text-sm text-velox-muted">{label}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-12 flex max-w-2xl flex-wrap items-center justify-center gap-2 text-velox-gold-light/80">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-velox-gold/30 text-velox-gold/50" aria-hidden />
          ))}
          <span className="ml-2 text-xs uppercase tracking-wider text-velox-muted">Trusted by global travelers</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 bg-velox-void py-14">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 px-4 text-center sm:flex-row sm:px-8 sm:text-left lg:px-12">
          <div>
            <p className="font-display text-lg text-white">Velox VIP</p>
            <p className="mt-1 text-xs text-velox-muted">Chauffeured excellence · Since inception</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-velox-muted">
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
            <span className="flex items-center gap-1.5 text-white/40">
              <Headphones className="h-3.5 w-3.5" aria-hidden />
              Concierge 24/7
            </span>
            <span className="flex items-center gap-1.5 text-white/40">
            +306969696969
            </span>
          </div>
        </div>
      </footer>
    </PageWrapper>
  )
}

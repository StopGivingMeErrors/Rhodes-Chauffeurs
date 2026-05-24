# Rhodes Chauffeurs

Production site: [rodoschauffeurs.gr](https://rodoschauffeurs.gr)

VIP transfers and chauffeur services in Rhodes — fleet catalog, multi-step booking, Stripe Checkout, admin operations, and transactional email.

## Quick start

```bash
npm install
cp .env.example .env   # fill VITE_SUPABASE_* and Stripe publishable key
npm run dev
```

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev server (Vite) |
| `npm run build` | Production build |
| `npm run test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |

## Documentation (client handoff)

| Document | Audience |
|----------|----------|
| [docs/CLIENT_HANDOFF.md](docs/CLIENT_HANDOFF.md) | **Start here** — product overview, roles, flows |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, folders, data flow |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Supabase, Stripe, Resend, go-live checklist |
| [docs/API_AND_INTEGRATIONS.md](docs/API_AND_INTEGRATIONS.md) | Edge Functions, webhooks, secrets |

## Stack

- **Frontend:** React 18, Vite, TypeScript, TanStack Query, Zustand, Tailwind CSS 4
- **Backend:** Supabase (Postgres, Auth, RLS, Realtime, Edge Functions)
- **Payments:** Stripe Hosted Checkout + webhooks
- **Email:** Resend (via `send-email` Edge Function)

## License

Proprietary — Rhodes Chauffeurs client project.

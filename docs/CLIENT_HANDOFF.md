# Rhodes Chauffeurs — Client handoff

This document is the **starting point** for operators, stakeholders, and technical owners taking over the Rhodes Chauffeurs platform.

**Production URL:** https://rodoschauffeurs.gr

## What the product does

Rhodes Chauffeurs is a private chauffeur booking web application for VIP transfers in Rhodes:

| Audience | Capabilities |
|----------|----------------|
| **Guests / clients** | Browse fleet, complete a 3-step booking wizard (route or custom trip → contact → checkout), pay via Stripe Checkout for fixed routes, view confirmation and booking history |
| **Admins** | Manage fleet, drivers, routes, bookings; assign chauffeurs and vehicles; confirm or cancel rides; export PDF; send client notification emails |

## User journeys

### 1. Book and pay (client)

1. Sign up or log in (`/login`).
2. Open **Book** (`/book`) — wizard steps: route or custom itinerary → contact → checkout (fixed routes: card via Stripe; custom trips: cash to driver).
3. A **pending** booking row is created in Supabase when the client reaches checkout.
4. **Pay with card** redirects to Stripe Hosted Checkout (same browser tab).
5. After payment, Stripe redirects to `/confirmation/:bookingId`.
6. The **`stripe-webhook`** Edge Function confirms the booking (`status → confirmed`) and records payment.

### 2. Manage trips (client dashboard)

- `/dashboard` — list of the signed-in user’s bookings, profile settings, cancel pending bookings where allowed.

### 3. Operations (admin)

- `/admin` — KPI overview, bookings table (filter, assign driver, status updates), fleet and driver management.
- Cancelling a booking can trigger a **cancellation email** to the client (`send-email` with `admin_cancel` mode).

## Booking lifecycle

| Status | Meaning |
|--------|---------|
| `pending` | Created; awaiting payment or admin action |
| `confirmed` | Paid (or cash-confirmed); ready for assignment |
| `assigned` | Driver assigned |
| `in_progress` | Trip underway |
| `completed` | Finished |
| `cancelled` | Cancelled by client or admin |

Payment rows live in `payments` with Stripe Payment Intent IDs; status: `pending`, `succeeded`, `failed`, `refunded`.

## Roles

Stored on `profiles.role`:

- **`client`** — default; can create and view own bookings.
- **`admin`** — full admin dashboard; RLS policies allow broader read/write.
- **`driver`** — roster entity; referenced on bookings when assigned.

To promote a user to admin, update `profiles.role` to `admin` in Supabase (SQL or Table Editor) for that user’s UUID.

## External services (required for production)

| Service | Purpose |
|---------|---------|
| **Supabase** | Database, Auth, Edge Functions, RLS |
| **Stripe** | Hosted Checkout + webhooks |
| **Resend** | Transactional email |
| **Hosting** | Static deploy of Vite `dist/` (Vercel, Netlify, Cloudflare Pages, etc.) |

See [DEPLOYMENT.md](./DEPLOYMENT.md) for setup steps and [API_AND_INTEGRATIONS.md](./API_AND_INTEGRATIONS.md) for Edge Function contracts.

## Quality assurance

Automated **unit tests** cover validation, wizard helpers, formatters, and admin PDF export:

```bash
npm run test
```

Recommended **manual smoke test** before go-live:

- [ ] Register, confirm email (if enabled), log in
- [ ] Complete booking wizard; verify single `pending` row (no duplicate on refresh)
- [ ] Stripe test card payment; land on confirmation; booking `confirmed`
- [ ] Admin: assign driver, send ride-confirmed email
- [ ] Admin: cancel booking; client receives cancellation email
- [ ] Client: cancel pending booking
- [ ] Log out and log in as different user — wizard state cleared

## Repository map

| Path | Description |
|------|-------------|
| `src/pages/` | Route-level screens |
| `src/components/booking/wizard/` | Booking wizard steps |
| `src/services/` | Supabase / Stripe / API calls |
| `src/stores/` | Zustand (auth, booking wizard persistence) |
| `supabase/migrations/` | Postgres schema + RLS |
| `supabase/functions/` | Edge Functions (checkout, webhook, email) |
| `docs/` | Architecture, deployment, API reference |

## Support contacts

Configure in your operations runbook:

- Stripe Dashboard — payments and webhook delivery logs
- Supabase Dashboard — database, Auth, function logs
- Resend Dashboard — email delivery and domain verification

## Further reading

- [ARCHITECTURE.md](./ARCHITECTURE.md) — technical design
- [DEPLOYMENT.md](./DEPLOYMENT.md) — go-live checklist
- [API_AND_INTEGRATIONS.md](./API_AND_INTEGRATIONS.md) — Edge Functions and secrets

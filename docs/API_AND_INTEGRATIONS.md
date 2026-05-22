# API and integrations

## Client → Supabase (PostgREST)

The SPA uses `@supabase/supabase-js` with the **anon/publishable** key. All access is subject to **RLS**.

### Main tables (read/write via services)

| Table | Client operations | Admin operations |
|-------|-------------------|------------------|
| `vehicles` | `select` available fleet | full CRUD in admin panel |
| `bookings` | insert/update own pending; read own | list all, update status, assign driver |
| `payments` | read own via booking | read via admin bookings |
| `profiles` | read/update own | read drivers/clients as policy allows |

Booking service functions (`src/services/bookingService.ts`):

| Function | Description |
|----------|-------------|
| `createBooking` | Insert pending booking with overlap validation |
| `updatePendingBooking` | Patch pending booking only (`.maybeSingle()` — clear error if 0 rows) |
| `cancelBookingByClient` | Client cancel pending |
| `listBookingsForUser` | Dashboard list |
| `listAllBookingsAdmin` | Admin table |
| `assignBookingDriver` | Set `driver_id`, may bump status |
| `updateBookingStatus` | Admin status transitions |
| `requestRideConfirmedClientEmail` | Invoke `send-email` (`admin_notify`) |
| `requestBookingCancelledClientEmail` | Invoke `send-email` (`admin_cancel`) |

### Validation (`bookingValidation.ts`)

`assertDraftPersistable(draft)` throws before network calls if:

- Pickup/dropoff addresses empty
- Invalid pickup datetime
- Passengers &lt; 1
- Price ≤ 0

`formatPostgrestError(error)` normalizes Supabase errors for UI toasts.

---

## Edge Function: `create-checkout-session`

**Invoke:** `supabase.functions.invoke('create-checkout-session', { body })`  
**Auth:** User JWT required (`verify_jwt = true`).

### Request body

```json
{
  "bookingId": "uuid",
  "customerEmail": "client@example.com",
  "currency": "eur",
  "appOrigin": "https://app.example.com"
}
```

### Success response

```json
{
  "url": "https://checkout.stripe.com/c/pay/..."
}
```

### Behavior

- Loads booking with user context; must be `pending` with valid price.
- Creates Stripe Checkout Session; metadata includes `bookingId`.
- `success_url` / `cancel_url` point to `{appOrigin}/confirmation/{bookingId}` (with query flags as implemented).
- Does **not** require `payment_intent` on the session before redirect.

### Errors

JSON `{ "error": "...", "detail": "..." }` — client parses via `FunctionsHttpError` in `stripeService.ts`.

---

## Edge Function: `stripe-webhook`

**URL:** `POST /functions/v1/stripe-webhook`  
**Auth:** Stripe signature header (`Stripe-Signature`), not Supabase JWT.

### Handled events

- `payment_intent.succeeded` — primary path: confirm booking, insert/update `payments`
- `payment_intent.payment_failed` — record failure state
- `checkout.session.completed` — supplementary (if enabled in Stripe)

### Metadata

PaymentIntents should carry `bookingId` or `booking_id` in metadata (set when session/PI is created).

### Side effects (service role)

1. Upsert `payments` with amount, currency, `stripe_payment_intent_id`
2. Update `bookings.status` → `confirmed`, set `final_price`
3. May send payment receipt email (Resend) when configured

### Operations

- Rotate `STRIPE_WEBHOOK_SECRET` in Supabase if you recreate the endpoint in Stripe.
- Use Stripe Dashboard → Webhooks → event log for delivery debugging.

---

## Edge Function: `send-email`

**Auth (one of):**

1. **Database webhook:** `Authorization: Bearer <BOOKING_EMAIL_WEBHOOK_SECRET>` or `x-webhook-secret`
2. **Admin invoke:** `Authorization: Bearer <user_access_token>` with admin profile

### Admin invoke body

**Ride confirmed / team notification:**

```json
{
  "mode": "admin_notify", 
  "bookingId": "uuid",
  "reason": "optional string"
}
```

**Cancellation apology:**

```json
{
  "mode": "admin_cancel",  
  "bookingId": "uuid"
}
```

### Requirements

- `RESEND_API_KEY`, `RESEND_FROM` secrets
- Resolves recipient from `profiles.email` or `auth.admin.getUserById` fallback
- Returns 4xx/5xx with message body; client surfaces in admin toasts

---

## Stripe (browser)

`VITE_STRIPE_PUBLISHABLE_KEY` is listed in `.env.example` for compatibility; **card entry happens on Stripe Hosted Checkout**, not in-app Elements.

Flow entry: `startHostedStripeCheckout(bookingId, email, currency)` in `stripeService.ts`.

---

## Environment reference

See [`.env.example`](../.env.example) for the full split between Vite (public) and Edge (secret) variables.

---

## NPM scripts

| Script | Action |
|--------|--------|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production bundle |
| `npm run test` | Vitest unit tests |
| `npm run test:coverage` | Coverage report (`src/utils`) |
| `npm run db:push` | Push migrations to linked Supabase |
| `npx supabase functions deploy <name>` | Deploy single Edge Function |

---

## Error codes (client)

| Code / symptom | Meaning |
|----------------|---------|
| PostgREST `PGRST116` | `.single()` expected one row, got zero — often updating a non-pending booking |
| Overlap / 400 on create | Scheduling conflict with existing booking |
| `FunctionsHttpError` | Edge Function returned non-2xx; parse JSON `error` field |

---

## Versioning and changes

When modifying Edge Functions, always redeploy after secret or code changes. Frontend can be deployed independently, but checkout/email behavior requires matching function versions on Supabase.

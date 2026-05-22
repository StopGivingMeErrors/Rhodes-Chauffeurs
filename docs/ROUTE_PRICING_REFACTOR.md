# Route-based pricing refactor (spec)

**Scope:** Pricing + Stripe only. No architecture redesign.

## Source of truth

| Booking type | Price field | When set | Stripe charges |
|--------------|-------------|----------|----------------|
| `fixed` | `estimated_price` (locked at INSERT from `routes.price`) | Booking creation | `estimated_price` |
| `custom` | `quoted_price` | Admin sets quote | `quoted_price` (after quote) |

Stripe Checkout uses **dynamic `price_data`** only (already in `create-checkout-session`). No Stripe Products.

---

## 1. Database migration

**File:** `supabase/migrations/20260620120000_route_based_pricing.sql`

- `public.routes` — `id`, `title`, `pickup_address`, `dropoff_address`, `pickup_lat/lng`, `dropoff_lat/lng`, `price`, `active`, `sort_order`
- `bookings` adds: `booking_type`, `route_id`, `quoted_price`, `stripe_session_id`, `stripe_payment_intent_id`, `paid_at`
- `pricing_mode` check extended: `fixed_route`, `custom_quote` (legacy `standard_vehicle` still readable)
- Seed 3 routes from former `popularRides.ts`
- RLS: anon/authenticated read active routes; admin write routes

**Keep (operational, not pricing):** `vehicle_id` for calendar overlap — auto-set to single fleet vehicle on INSERT.

**Deprecate (do not delete columns yet):** `vehicles.standard_price` — stop using in app.

---

## 2. Stripe refactor

**File:** `supabase/functions/create-checkout-session/index.ts`

```text
chargeAmount = booking_type === 'custom' ? quoted_price : estimated_price
```

- Reject custom bookings without `quoted_price > 0`
- Reject fixed without `estimated_price > 0`
- On success: `UPDATE bookings SET stripe_session_id = session.id`
- Idempotency key: `checkout-{bookingId}-{chargeAmount}` (regenerate when quote changes)

**File:** `supabase/functions/stripe-webhook/index.ts`

- On success: set `bookings.paid_at`, `bookings.stripe_payment_intent_id` (in addition to `payments` row)

---

## 3. Files to modify

### Backend / services

| File | Change |
|------|--------|
| `src/services/routeService.ts` | **NEW** — list routes, admin CRUD |
| `src/services/bookingService.ts` | Draft from route/custom; `chargeAmount()`; admin `setQuotedPrice`, `requestPaymentLink` |
| `src/types/booking.ts` | `BookingType`, `quotedPrice`, `routeId`, pricing modes |
| `src/types/route.ts` | **NEW** |
| `supabase/functions/create-checkout-session/index.ts` | Charge logic + session id |
| `supabase/functions/stripe-webhook/index.ts` | Mirror paid fields on booking |

### Frontend booking

| File | Change |
|------|--------|
| `src/utils/bookingWizard.ts` | Remove `vehicle.standardPrice`; fixed/custom draft builders |
| `src/utils/bookingValidation.ts` | Validate route price / custom no immediate charge |
| `src/stores/bookingStore.ts` | `routeId`, `bookingType`; v5 persist key |
| `src/pages/BookingPage.tsx` | 3-step wizard; no vehicle step |
| `src/components/booking/wizard/StepIndicator.tsx` | Journey → Contact → Pay |
| `src/components/booking/wizard/PopularRidesSection.tsx` | Load routes + show **price** |
| `src/components/booking/wizard/CheckoutStep.tsx` | No vehicle; show locked/quoted price |
| `src/components/booking/wizard/JourneyStep.tsx` | Custom = quote request copy |
| **Remove usage** | `VehicleStep.tsx` (keep file or delete) |

### Admin

| File | Change |
|------|--------|
| `src/components/admin/AdminRoutesPanel.tsx` | **NEW** — route CRUD + price |
| `src/components/admin/AdminFleetPanel.tsx` | Remove price editing (availability only) |
| `src/components/admin/AdminBookingsPanel.tsx` | Quote input + “Send payment link” for custom |
| `src/components/admin/AdminDashboardSidebar.tsx` | Fleet → Routes |
| `src/pages/AdminDashboard.tsx` | Render `AdminRoutesPanel` |

### Cleanup / docs

| File | Change |
|------|--------|
| `src/config/popularRides.ts` | Deprecated — seed in DB only |
| `src/pages/LandingPage.tsx` | Routes or generic CTA, no fleet pricing |
| `src/utils/validators.ts` | Drop `vehicleStepSchema` from wizard |
| Tests | Update `bookingWizard.test.ts`, etc. |

---

## 4. Frontend pricing flow

```text
FIXED:
  Step 1: Pick route (price visible) → schedule
  Step 2: Contact
  Step 3: Pay — UI shows estimated_price === route.price at lock time → Stripe same amount

CUSTOM:
  Step 1: Enter addresses → schedule
  Step 2: Contact → creates booking, quoted_price NULL
  Step 3: Message “Quote pending” — no Stripe
  Later: Admin sets quoted_price → email/payment link → client pays quoted_price
```

---

## 5. Legacy logic removed

- `buildBookingDraft({ vehicle })` using `vehicle.standardPrice`
- Vehicle step in wizard
- Admin fleet **standard price** UI
- `pricing_mode: 'standard_vehicle'` for new bookings
- `PopularRides` static pricing comments
- Checkout copy referencing “vehicle list rate”
- `validators.vehicleStepSchema` in booking flow
- Landing `?vehicle=` deep link (optional remove)

---

## 6. Risk areas

| Risk | Mitigation |
|------|------------|
| UI price ≠ Stripe | Single `chargeAmount(booking)` used in UI + edge function |
| Route price changes after draft | Lock `estimated_price` at INSERT; store `route_id` |
| Quote changes after session | New session idempotency key; invalidate old `stripe_session_id` |
| Overlap without `vehicle_id` | Auto-assign first available vehicle |
| Old persisted wizard (v4) | Bump store to `velox-booking-wizard-v5` |
| Custom booking hits Stripe early | Block checkout until `quoted_price` set |
| Webhook only path | Keep `estimated_price`/`quoted_price` on booking as charge source |

---

## 7. Deploy order

1. `npm run db:push` (migration + seed routes)
2. Set route prices in admin
3. Deploy edge functions
4. Deploy frontend
5. Verify: fixed route E2E pay; custom quote → admin price → payment link

# Deployment guide

## Prerequisites

- Node.js 20+ and npm
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npx supabase` works without global install)
- Stripe account (test + live modes)
- Resend account with verified sending domain (production)
- Static host for the Vite app (Vercel, Netlify, etc.)

## 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Link locally:

   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Apply migrations:

   ```bash
   npm run db:push
   ```

4. **Auth → URL configuration**
   - Site URL: production app URL (e.g. `https://app.veloxvip.com`)
   - Redirect URLs: production + `http://localhost:5173` for dev
   - Enable email confirmation if required for your launch policy

5. **Auth emails vs Resend (important)**
   - **Sign-up confirmation, password reset, magic links** are sent by **Supabase Auth** (sender is often `noreply@mail.app.supabase.io` unless you configure custom SMTP). This is expected.
   - **Booking emails** (new booking alert to ops, ride confirmed, cancellation, payment receipt) use **Resend** via Edge Functions (`send-email`, `stripe-webhook`).
   - To send auth emails from your domain via Resend: Supabase Dashboard → **Authentication → SMTP** → enable custom SMTP and use [Resend SMTP credentials](https://resend.com/docs/send-with-smtp).
   - Supabase Auth has strict **rate limits** on sign-up / resend confirmation — avoid clicking “resend” repeatedly or refreshing the confirm link many times.

6. Create at least one **admin** user (sign up normally, then SQL):

   ```sql
   update public.profiles set role = 'admin' where email = 'ops@yourdomain.com';
   ```

## 2. Edge Function secrets

In **Supabase Dashboard → Edge Functions → Secrets** (or `npx supabase secrets set`):

| Secret | Required | Used by |
|--------|----------|---------|
| `STRIPE_SECRET_KEY` | yes | `create-checkout-session`, `stripe-webhook` |
| `STRIPE_WEBHOOK_SECRET` | yes | `stripe-webhook` |
| `RESEND_API_KEY` | yes | `send-email`, receipt in `stripe-webhook` |
| `RESEND_FROM` | yes | e.g. `Velox VIP <bookings@yourdomain.com>` |
| `BOOKING_EMAIL_WEBHOOK_SECRET` | if using DB webhooks | `send-email` |
| `ADMIN_NOTIFY_EMAILS` | recommended | `send-email` — comma-separated ops inboxes when a guest creates a booking (also emails `profiles.role = admin`) |
| `ACCESS_CONTROL_ALLOW_ORIGIN` | optional | lock CORS to production origin |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically in hosted functions.

Deploy functions (Windows-friendly):

```bash
npx supabase functions deploy create-checkout-session
npx supabase functions deploy stripe-webhook
npx supabase functions deploy send-email
```

## 3. Stripe

### Checkout

- Use **test keys** until UAT sign-off.
- Publishable key → `VITE_STRIPE_PUBLISHABLE_KEY` in `.env` for local/build.
- Secret key → Supabase secret `STRIPE_SECRET_KEY`.

### Webhook endpoint

1. Stripe Dashboard → Developers → Webhooks → Add endpoint.
2. URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
3. Events (minimum):
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - (optional) `checkout.session.completed`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET` in Supabase.

Test locally with Stripe CLI:

```bash
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
```

## 4. Resend

1. Verify your sending domain in Resend.
2. Set `RESEND_FROM` to an address on that domain.
3. Without domain verification, Resend only delivers to your account’s test recipients.

## 5. Frontend

1. Copy `.env.example` → `.env` and fill:

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ... or sb_publishable_...
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

2. Build and deploy:

   ```bash
   npm ci
   npm run test
   npm run build
   ```

3. Upload `dist/` or connect Git to your host; set the same `VITE_*` variables in the host’s build environment.

### Vercel (recommended)

1. Import the Git repo in [Vercel](https://vercel.com) — framework preset **Vite**.
2. Build command: `npm run build` · output directory: `dist`.
3. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY` under **Environment Variables**.
4. `vercel.json` in the repo already rewrites all routes to `index.html` and sets basic security headers.
5. After deploy, add the production URL to Supabase **Auth → URL configuration** (Site URL + Redirect URLs).
6. Set `ACCESS_CONTROL_ALLOW_ORIGIN` in Supabase secrets to your Vercel URL (e.g. `https://your-app.vercel.app`).

## 6. Optional: database webhooks for email

If you want automatic emails on booking updates (without admin button):

1. Supabase Database Webhooks → target `send-email` function URL.
2. Send header `Authorization: Bearer <BOOKING_EMAIL_WEBHOOK_SECRET>` or `x-webhook-secret`.
3. Payload shape must match what `send-email` expects (see API doc).

## Go-live checklist

- [ ] Migrations applied on production Supabase
- [ ] All three Edge Functions deployed with secrets set
- [ ] Stripe **live** webhook pointing to production function URL
- [ ] Resend domain verified; `RESEND_FROM` uses production domain
- [ ] Auth redirect URLs include production domain
- [ ] `npm run test` and `npm run build` pass in CI or locally
- [ ] Smoke test: book → pay → confirm → admin assign → cancel email
- [ ] Monitoring: Supabase logs, Stripe webhook delivery, Resend activity

## Rollback

- **Frontend:** redeploy previous `dist` artifact from host history.
- **Database:** avoid destructive rollback; forward-fix with new migrations.
- **Functions:** redeploy prior Git commit’s `supabase/functions/*` via CLI.

## Common issues

| Symptom | Likely cause |
|---------|----------------|
| Checkout 401 | User not signed in or JWT expired |
| Payment succeeds but booking stays pending | Webhook not delivered or wrong `STRIPE_WEBHOOK_SECRET` |
| Duplicate pending bookings | Wizard state lost; ensure `velox-booking-wizard-v4` persistence and latest client build |
| Admin email 500 | Missing `RESEND_API_KEY` / `RESEND_FROM`, or unverified domain |
| PGRST116 on update | Updating non-pending booking with client update API |

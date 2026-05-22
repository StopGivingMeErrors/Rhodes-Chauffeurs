-- Route-based pricing: admin-defined routes + custom quotes (replaces vehicle list pricing).

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  pickup_address text not null,
  dropoff_address text not null,
  pickup_lat numeric(9, 6),
  pickup_lng numeric(9, 6),
  dropoff_lat numeric(9, 6),
  dropoff_lng numeric(9, 6),
  price numeric(10, 2) not null check (price >= 0),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.routes is 'Fixed pickup→destination routes with published prices (single-vehicle fleet).';

create index if not exists routes_active_sort_idx on public.routes (active, sort_order);

alter table public.bookings
  add column if not exists booking_type text not null default 'fixed'
    check (booking_type in ('fixed', 'custom'));

alter table public.bookings
  add column if not exists route_id uuid references public.routes (id) on delete set null;

alter table public.bookings
  add column if not exists quoted_price numeric(10, 2) check (quoted_price is null or quoted_price >= 0);

alter table public.bookings
  add column if not exists stripe_session_id text;

alter table public.bookings
  add column if not exists stripe_payment_intent_id text;

alter table public.bookings
  add column if not exists paid_at timestamptz;

comment on column public.bookings.estimated_price is 'Locked trip price for fixed routes at booking creation.';
comment on column public.bookings.quoted_price is 'Admin-set price for custom route bookings before Stripe checkout.';

-- Extend pricing_mode for new bookings (keep legacy values readable).
alter table public.bookings drop constraint if exists bookings_pricing_mode_check;
alter table public.bookings
  add constraint bookings_pricing_mode_check
  check (pricing_mode in ('standard_vehicle', 'fixed_route', 'custom_quote'));

-- Seed default routes (prices are placeholders — set in admin).
insert into public.routes (
  id,
  title,
  subtitle,
  pickup_address,
  dropoff_address,
  pickup_lat,
  pickup_lng,
  dropoff_lat,
  dropoff_lng,
  price,
  active,
  sort_order
)
values
  (
    'a0000000-0000-4000-8000-000000000001',
    'Diagoras Airport → Kiotari',
    'South coast · most-booked resort transfer',
    'Rhodes International Airport "Diagoras" (RHO), Paradisi, Greece',
    'Kiotari, South Rhodes, Greece',
    36.4054,
    28.0862,
    36.0452,
    27.9864,
    120.00,
    true,
    1
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'Diagoras Airport → Lindos',
    'Whitewashed village · scenic south-east',
    'Rhodes International Airport "Diagoras" (RHO), Paradisi, Greece',
    'Lindos, Rhodes, Greece',
    36.4054,
    28.0862,
    36.092,
    28.0886,
    95.00,
    true,
    2
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    'Rhodes Town → Diagoras Airport',
    'Old town / port to departure',
    'Rhodes Old Town, Mandraki, Rhodes, Greece',
    'Rhodes International Airport "Diagoras" (RHO), Paradisi, Greece',
    36.4513,
    28.2278,
    36.4054,
    28.0862,
    85.00,
    true,
    3
  )
on conflict (id) do nothing;

alter table public.routes enable row level security;

drop policy if exists "routes_select_active" on public.routes;
create policy "routes_select_active"
on public.routes
for select
to anon, authenticated
using (active = true);

drop policy if exists "routes_admin_all" on public.routes;
create policy "routes_admin_all"
on public.routes
for all
to authenticated
using ((select public.current_user_is_admin()))
with check ((select public.current_user_is_admin()));

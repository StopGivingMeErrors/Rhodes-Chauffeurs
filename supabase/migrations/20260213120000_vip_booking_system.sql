-- =============================================================================
-- Velox VIP — Supabase schema: profiles, vehicles, bookings, payments
-- Run via Supabase CLI or SQL editor. Idempotent sections use IF NOT EXISTS
-- where supported; review before re-applying on production.
--
-- Note: This schema uses the VIP column layout below. If your Vite app still
-- maps older snake_case fields (e.g. vehicle_class), update services/types to
-- match these tables or add compatibility views.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tables
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  email text unique not null,
  role text not null default 'client'
    check (role in ('client', 'admin', 'driver')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Application profile; 1:1 with auth.users.';

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  category text not null
    check (category in ('sedan', 'suv', 'van', 'sprinter')),
  capacity int not null check (capacity > 0),
  price_per_km numeric(10, 2) not null check (price_per_km >= 0),
  base_price numeric(10, 2) not null check (base_price >= 0),
  image_url text,
  features text[] not null default '{}',
  available boolean not null default true
);

comment on table public.vehicles is 'Fleet catalog; pricing in EUR unless you change business rules.';

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid (),
  client_id uuid not null references public.profiles (id) on delete restrict,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  driver_id uuid references public.profiles (id) on delete set null,
  pickup_address text not null,
  dropoff_address text not null,
  pickup_lat numeric(9, 6),
  pickup_lng numeric(9, 6),
  dropoff_lat numeric(9, 6),
  dropoff_lng numeric(9, 6),
  pickup_datetime timestamptz not null,
  passengers int not null check (passengers > 0),
  flight_number text,
  special_requests text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled')),
  estimated_price numeric(10, 2),
  final_price numeric(10, 2),
  distance_km numeric(8, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.bookings is 'VIP transport reservations.';

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid (),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  stripe_payment_intent_id text unique not null,
  stripe_customer_id text,
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'eur',
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.payments is 'Stripe-backed payment rows; prefer service role for writes from webhooks.';

create index if not exists bookings_client_id_idx on public.bookings (client_id);
create index if not exists bookings_driver_id_idx on public.bookings (driver_id);
create index if not exists bookings_vehicle_id_idx on public.bookings (vehicle_id);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists payments_booking_id_idx on public.payments (booking_id);

-- -----------------------------------------------------------------------------
-- 2. Auth → profiles sync
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    case
      when new.raw_user_meta_data ->> 'role' in ('client', 'admin', 'driver')
        then new.raw_user_meta_data ->> 'role'
      else 'client'
    end
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user ();

-- -----------------------------------------------------------------------------
-- 3. updated_at on bookings
-- -----------------------------------------------------------------------------

create or replace function public.set_bookings_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_bookings_set_updated_at on public.bookings;

create trigger trg_bookings_set_updated_at
before update on public.bookings
for each row
execute function public.set_bookings_updated_at ();

-- -----------------------------------------------------------------------------
-- 4. Realtime: broadcast new bookings on topic "bookings"
--    Clients: supabase.channel('bookings').on('broadcast', { event: 'INSERT' }, ...)
--    Requires Realtime Authorization policy on realtime.messages (see §6).
-- -----------------------------------------------------------------------------

create or replace function public.broadcast_booking_insert_realtime ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform realtime.broadcast_changes (
    'bookings',
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return new;
end;
$$;

drop trigger if exists trg_bookings_broadcast_insert on public.bookings;

create trigger trg_bookings_broadcast_insert
after insert on public.bookings
for each row
execute function public.broadcast_booking_insert_realtime ();

-- -----------------------------------------------------------------------------
-- 5. Drivers may only change status (and updated_at via trigger) on assignments
-- -----------------------------------------------------------------------------

create or replace function public.enforce_driver_booking_update_columns ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
begin
  select p.role into user_role
  from public.profiles p
  where p.id = auth.uid ();

  if user_role = 'driver' then
    if
      (to_jsonb (new) - 'status' - 'updated_at')
      is distinct from
      (to_jsonb (old) - 'status' - 'updated_at')
    then
      raise exception 'Drivers may only update booking status';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_bookings_driver_column_guard on public.bookings;

create trigger trg_bookings_driver_column_guard
before update on public.bookings
for each row
execute function public.enforce_driver_booking_update_columns ();

-- -----------------------------------------------------------------------------
-- 6. Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;

-- Helper predicate in policies: current user is admin
-- profiles: own row + admins see all
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid ())
  or exists (
    select 1
    from public.profiles pr
    where pr.id = (select auth.uid ())
      and pr.role = 'admin'
  )
);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid ())
  or exists (
    select 1
    from public.profiles pr
    where pr.id = (select auth.uid ())
      and pr.role = 'admin'
  )
)
with check (
  id = (select auth.uid ())
  or exists (
    select 1
    from public.profiles pr
    where pr.id = (select auth.uid ())
      and pr.role = 'admin'
  )
);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid ()));

-- vehicles: readable by all authenticated; writes by admins only
drop policy if exists "vehicles_select_authenticated" on public.vehicles;
create policy "vehicles_select_authenticated"
on public.vehicles
for select
to authenticated
using (true);

drop policy if exists "vehicles_write_admin" on public.vehicles;
create policy "vehicles_write_admin"
on public.vehicles
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles pr
    where pr.id = (select auth.uid ())
      and pr.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles pr
    where pr.id = (select auth.uid ())
      and pr.role = 'admin'
  )
);

-- bookings
drop policy if exists "bookings_select_policy" on public.bookings;
create policy "bookings_select_policy"
on public.bookings
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles pr
    where pr.id = (select auth.uid ())
      and pr.role = 'admin'
  )
  or client_id = (select auth.uid ())
  or driver_id = (select auth.uid ())
);

drop policy if exists "bookings_insert_client_or_admin" on public.bookings;
create policy "bookings_insert_client_or_admin"
on public.bookings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles pr
    where pr.id = (select auth.uid ())
      and pr.role = 'admin'
  )
  or client_id = (select auth.uid ())
);

drop policy if exists "bookings_update_admin" on public.bookings;
create policy "bookings_update_admin"
on public.bookings
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles pr
    where pr.id = (select auth.uid ())
      and pr.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles pr
    where pr.id = (select auth.uid ())
      and pr.role = 'admin'
  )
);

drop policy if exists "bookings_update_client_own" on public.bookings;
create policy "bookings_update_client_own"
on public.bookings
for update
to authenticated
using (client_id = (select auth.uid ()))
with check (client_id = (select auth.uid ()));

drop policy if exists "bookings_update_assigned_driver" on public.bookings;
create policy "bookings_update_assigned_driver"
on public.bookings
for update
to authenticated
using (driver_id = (select auth.uid ()))
with check (driver_id = (select auth.uid ()));

drop policy if exists "bookings_delete_admin" on public.bookings;
create policy "bookings_delete_admin"
on public.bookings
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles pr
    where pr.id = (select auth.uid ())
      and pr.role = 'admin'
  )
);

-- payments: clients read via booking ownership; admins all; inserts via service role typical
drop policy if exists "payments_select_policy" on public.payments;
create policy "payments_select_policy"
on public.payments
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles pr
    where pr.id = (select auth.uid ())
      and pr.role = 'admin'
  )
  or exists (
    select 1
    from public.bookings b
    where b.id = payments.booking_id
      and b.client_id = (select auth.uid ())
  )
);

drop policy if exists "payments_write_admin" on public.payments;
create policy "payments_write_admin"
on public.payments
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles pr
    where pr.id = (select auth.uid ())
      and pr.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles pr
    where pr.id = (select auth.uid ())
      and pr.role = 'admin'
  )
);

-- Realtime broadcast delivery (private channels / broadcast from DB)
drop policy if exists "realtime_messages_select_authenticated" on realtime.messages;
create policy "realtime_messages_select_authenticated"
on realtime.messages
for select
to authenticated
using (true);

-- -----------------------------------------------------------------------------
-- 7. Publication for postgres changes (optional; complements broadcast)
-- -----------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.bookings;
exception
  when duplicate_object then null;
end
$$;

-- -----------------------------------------------------------------------------
-- 8. Seed: five luxury vehicles (EUR, Unsplash imagery)
-- -----------------------------------------------------------------------------

insert into public.vehicles (
  name,
  category,
  capacity,
  price_per_km,
  base_price,
  image_url,
  features,
  available
)
select *
from (
  values
    (
      'Mercedes-Maybach S-Class',
      'sedan'::text,
      3,
      4.50::numeric,
      189.00::numeric,
      'https://images.unsplash.com/photo-1618843479313-40f8b4d528e0?auto=format&fit=crop&w=1600&q=80'::text,
      array['WiFi', 'Chilled water', 'Privacy partition', 'Rear executive seats']::text[],
      true
    ),
    (
      'BMW 7 Series Long Wheelbase',
      'sedan',
      3,
      3.90,
      165.00,
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1600&q=80',
      array['WiFi', 'Massage seats', 'Panoramic roof'],
      true
    ),
    (
      'Range Rover Autobiography',
      'suv',
      4,
      4.20,
      195.00,
      'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1600&q=80',
      array['WiFi', 'Air suspension', 'Heated & cooled seats', 'Tow hitch'],
      true
    ),
    (
      'Mercedes-Benz V-Class Exclusive',
      'van',
      7,
      3.40,
      145.00,
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1600&q=80',
      array['WiFi', 'Conference seating', 'Ambient lighting', 'Extra luggage'],
      true
    ),
    (
      'Mercedes-Benz Sprinter Jet',
      'sprinter',
      14,
      3.10,
      225.00,
      'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1600&q=80',
      array['WiFi', 'Champagne service', 'Restroom option', 'AV system', 'Host tray'],
      true
    )
) as v (name, category, capacity, price_per_km, base_price, image_url, features, available)
where not exists (
  select 1
  from public.vehicles e
  where e.name = v.name
);

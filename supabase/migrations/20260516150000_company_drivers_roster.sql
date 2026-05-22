-- Internal chauffeur roster (not auth users). Bookings.driver_id references company_drivers.

create table if not exists public.company_drivers (
  id uuid primary key default gen_random_uuid (),
  full_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now ()
);

comment on table public.company_drivers is
  'Company-managed driver list (name, contact). Not linked to auth.users.';

create index if not exists company_drivers_full_name_idx on public.company_drivers (full_name);

-- Replace FK: driver_id used to reference profiles; clear legacy profile UUIDs.
alter table public.bookings
  drop constraint if exists bookings_driver_id_fkey;

update public.bookings
set
  driver_id = null
where
  driver_id is not null;

alter table public.bookings
  add constraint bookings_driver_id_fkey
  foreign key (driver_id) references public.company_drivers (id) on delete set null;

alter table public.company_drivers enable row level security;

drop policy if exists "company_drivers_select_admin" on public.company_drivers;

create policy "company_drivers_select_admin"
on public.company_drivers
for select
to authenticated
using ((select public.current_user_is_admin ()));

drop policy if exists "company_drivers_write_admin" on public.company_drivers;

create policy "company_drivers_write_admin"
on public.company_drivers
for all
to authenticated
using ((select public.current_user_is_admin ()))
with check ((select public.current_user_is_admin ()));

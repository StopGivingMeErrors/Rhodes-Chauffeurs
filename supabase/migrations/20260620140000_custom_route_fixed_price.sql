-- Custom routes: one admin-set premium price, paid at checkout like fixed routes.

create table if not exists public.app_settings (
  key text primary key,
  value_numeric numeric(10, 2) not null check (value_numeric >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.app_settings is 'Key/value settings (e.g. custom_route_price_eur).';

insert into public.app_settings (key, value_numeric)
values ('custom_route_price_eur', 150.00)
on conflict (key) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select_public" on public.app_settings;
create policy "app_settings_select_public"
on public.app_settings
for select
to anon, authenticated
using (key in ('custom_route_price_eur'));

drop policy if exists "app_settings_admin_write" on public.app_settings;
create policy "app_settings_admin_write"
on public.app_settings
for all
to authenticated
using ((select public.current_user_is_admin()))
with check ((select public.current_user_is_admin()));

alter table public.bookings drop constraint if exists bookings_pricing_mode_check;
alter table public.bookings
  add constraint bookings_pricing_mode_check
  check (pricing_mode in ('standard_vehicle', 'fixed_route', 'custom_quote', 'custom_route'));

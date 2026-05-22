-- Fleet list pricing: one admin-editable standard trip price per vehicle (no client-side fare math).

alter table public.vehicles
  add column if not exists standard_price numeric(10, 2);

update public.vehicles
set
  standard_price = round(
    (coalesce(base_price, 0) + 18 * coalesce(price_per_km, 0))::numeric,
    2
  )
where
  standard_price is null;

update public.vehicles
set
  standard_price = 0
where
  standard_price is null;

alter table public.vehicles
  alter column standard_price set default 0;

alter table public.vehicles
  alter column standard_price set not null;

alter table public.vehicles
  drop constraint if exists vehicles_standard_price_nonneg;

alter table public.vehicles
  add constraint vehicles_standard_price_nonneg check (standard_price >= 0);

comment on column public.vehicles.standard_price is
  'Published standard trip price (major currency units) for this vehicle; used as booking estimated_price.';

-- Bookings: single pricing mode — list price from selected vehicle.
do $$
declare
  cname text;
begin
  select con.conname
    into cname
  from pg_constraint con
  where
    con.conrelid = 'public.bookings'::regclass
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%pricing_mode%'
  limit 1;

  if cname is not null then
    execute format('alter table public.bookings drop constraint %I', cname);
  end if;
end
$$;

update public.bookings
set
  pricing_mode = 'standard_vehicle'
where
  pricing_mode is distinct from 'standard_vehicle';

alter table public.bookings
  add constraint bookings_pricing_mode_check check (
    pricing_mode in ('standard_vehicle')
  );

alter table public.bookings
  alter column pricing_mode set default 'standard_vehicle';

comment on column public.bookings.pricing_mode is 'Trip price source: standard list price of the selected vehicle.';

comment on column public.bookings.distance_km is
  'Optional route length for operations; not used for client pricing.';

-- Catalogue: passenger tiers (1–4 / 5–8) on fixed routes; Lindos starting base.

alter table public.routes
  add column if not exists price_1_4 numeric(10, 2) check (price_1_4 is null or price_1_4 >= 0);

alter table public.routes
  add column if not exists price_5_8 numeric(10, 2) check (price_5_8 is null or price_5_8 >= 0);

alter table public.routes
  add column if not exists pricing_unit text not null default 'trip'
    check (pricing_unit in ('trip', 'hour'));

comment on column public.routes.price_1_4 is 'Catalogue price for 1–4 passengers.';
comment on column public.routes.price_5_8 is 'Catalogue price for 5–8 passengers.';
comment on column public.routes.price is 'Display/admin fallback; typically same as price_1_4.';
comment on column public.routes.pricing_unit is 'trip = fixed fare; hour = island tour hourly (1hr minimum at booking).';

update public.routes
set
  price_1_4 = coalesce(price_1_4, price),
  price_5_8 = coalesce(price_5_8, price)
where
  price_1_4 is null or price_5_8 is null;

-- Retire legacy airport seeds
update public.routes
set
  active = false,
  updated_at = now()
where
  id in (
    'a0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000003'
  );

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
  price_1_4,
  price_5_8,
  pricing_unit,
  active,
  sort_order
)
values
  (
    'b1000000-0000-4000-8000-000000000001',
    'Island tour',
    'Starting base: Lindos · 1–4 guests €40/hr · 5–8 guests €60/hr',
    'Lindos, Rhodes, Greece',
    'Rhodes island tour (as arranged)',
    36.092,
    28.0886,
    null,
    null,
    40.00,
    40.00,
    60.00,
    'hour',
    true,
    1
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    'Rodos - port - old city',
    'Starting base: Lindos · 1–4 guests €80 · 5–8 guests €120',
    'Lindos, Rhodes, Greece',
    'Rodos port / Rhodes Old Town',
    36.092,
    28.0886,
    36.4513,
    28.2278,
    80.00,
    80.00,
    120.00,
    'trip',
    true,
    2
  ),
  (
    'b1000000-0000-4000-8000-000000000003',
    'Hospital',
    'Starting base: Lindos · €80 for 1–4 or 5–8 guests',
    'Lindos, Rhodes, Greece',
    'Rhodes General Hospital area',
    36.092,
    28.0886,
    36.4054,
    28.0862,
    80.00,
    80.00,
    80.00,
    'trip',
    true,
    3
  ),
  (
    'b1000000-0000-4000-8000-000000000004',
    'Faliraki',
    'Starting base: Lindos · 1–4 guests €65 · 5–8 guests €100',
    'Lindos, Rhodes, Greece',
    'Faliraki, Rhodes',
    36.092,
    28.0886,
    36.3398,
    28.1992,
    65.00,
    65.00,
    100.00,
    'trip',
    true,
    4
  ),
  (
    'b1000000-0000-4000-8000-000000000005',
    'Kolympia',
    'Starting base: Lindos · 1–4 guests €50 · 5–8 guests €80',
    'Lindos, Rhodes, Greece',
    'Kolympia, Rhodes',
    36.092,
    28.0886,
    36.4712,
    28.1558,
    50.00,
    50.00,
    80.00,
    'trip',
    true,
    5
  ),
  (
    'b1000000-0000-4000-8000-000000000006',
    'Panagia Tsampika',
    'Starting base: Lindos · 1–4 guests €45 · 5–8 guests €70',
    'Lindos, Rhodes, Greece',
    'Panagia Tsampika, Rhodes',
    36.092,
    28.0886,
    36.2134,
    28.1245,
    45.00,
    45.00,
    70.00,
    'trip',
    true,
    6
  )
on conflict (id) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  pickup_address = excluded.pickup_address,
  dropoff_address = excluded.dropoff_address,
  pickup_lat = excluded.pickup_lat,
  pickup_lng = excluded.pickup_lng,
  dropoff_lat = excluded.dropoff_lat,
  dropoff_lng = excluded.dropoff_lng,
  price = excluded.price,
  price_1_4 = excluded.price_1_4,
  price_5_8 = excluded.price_5_8,
  pricing_unit = excluded.pricing_unit,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = now();

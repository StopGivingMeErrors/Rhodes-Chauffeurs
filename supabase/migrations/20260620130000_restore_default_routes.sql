-- Re-insert Rhodes fixed routes if missing (preserves admin-edited price on conflict).

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
on conflict (id) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  pickup_address = excluded.pickup_address,
  dropoff_address = excluded.dropoff_address,
  pickup_lat = excluded.pickup_lat,
  pickup_lng = excluded.pickup_lng,
  dropoff_lat = excluded.dropoff_lat,
  dropoff_lng = excluded.dropoff_lng,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = now();

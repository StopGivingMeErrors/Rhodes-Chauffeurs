-- Block past pickups, one active trip per vehicle per calendar day (Rhodes), keep overlap windows.

create or replace function public.bookings_enforce_pickup_future ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.pickup_datetime < (now() + interval '30 minutes') then
    raise exception 'Pickup must be at least 30 minutes in the future';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bookings_pickup_future on public.bookings;

create trigger trg_bookings_pickup_future
before insert or update of pickup_datetime on public.bookings
for each row
execute function public.bookings_enforce_pickup_future ();

create or replace function public.bookings_enforce_vehicle_no_overlap ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dur int;
  win_end timestamptz;
begin
  if new.vehicle_id is null then
    return new;
  end if;
  if new.status in ('cancelled', 'completed') then
    return new;
  end if;

  if exists (
    select 1
    from public.bookings b
    where
      b.vehicle_id = new.vehicle_id
      and b.id is distinct from new.id
      and b.status in ('pending', 'confirmed', 'assigned', 'in_progress')
      and (b.pickup_datetime at time zone 'Europe/Athens')::date = (new.pickup_datetime at time zone 'Europe/Athens')::date
  ) then
    raise exception 'This vehicle already has a trip on that day';
  end if;

  dur := coalesce(new.service_duration_minutes, 120);
  win_end := new.pickup_datetime + make_interval(mins => dur);

  if win_end <= new.pickup_datetime then
    raise exception 'Invalid pickup vs service window';
  end if;

  if exists (
    select 1
    from public.bookings b
    where
      b.vehicle_id = new.vehicle_id
      and b.id is distinct from new.id
      and b.status in ('pending', 'confirmed', 'assigned', 'in_progress')
      and tstzrange(
        b.pickup_datetime,
        b.pickup_datetime + make_interval(mins => coalesce(b.service_duration_minutes, 120)),
        '[)'
      ) && tstzrange(new.pickup_datetime, win_end, '[)')
  ) then
    raise exception 'That vehicle is already reserved in this time window';
  end if;

  return new;
end;
$$;

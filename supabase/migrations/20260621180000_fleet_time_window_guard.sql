-- Fleet-wide active trip overlap (single operations calendar) in addition to per-vehicle rules.

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
  if new.status in ('cancelled', 'completed') then
    return new;
  end if;

  dur := coalesce(new.service_duration_minutes, 120);
  win_end := new.pickup_datetime + make_interval(mins => dur);

  if win_end <= new.pickup_datetime then
    raise exception 'Invalid pickup vs service window';
  end if;

  -- No second active reservation may overlap this time window (agency runs one dispatch calendar).
  if exists (
    select 1
    from public.bookings b
    where
      b.id is distinct from new.id
      and b.status in ('pending', 'confirmed', 'assigned', 'in_progress')
      and tstzrange(
        b.pickup_datetime,
        b.pickup_datetime + make_interval(mins => coalesce(b.service_duration_minutes, 120)),
        '[)'
      ) && tstzrange(new.pickup_datetime, win_end, '[)')
  ) then
    raise exception 'Another trip is already reserved in this time window';
  end if;

  if new.vehicle_id is null then
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

  return new;
end;
$$;

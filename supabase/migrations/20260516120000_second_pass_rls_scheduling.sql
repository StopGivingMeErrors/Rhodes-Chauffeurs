-- Second pass: vehicle calendar overlap, client booking mutation guard, profile role lock,
-- and cash RPC integration with the booking finalize session flag.
--
-- If CREATE TRIGGER fails because existing rows violate the overlap rule, fix or cancel
-- overlapping active bookings for the same vehicle_id, then re-apply.

-- -----------------------------------------------------------------------------
-- 1. Service window for fleet overlap (editable later per booking if needed)
-- -----------------------------------------------------------------------------

alter table public.bookings
  add column if not exists service_duration_minutes int not null default 120
    check (
      service_duration_minutes > 0
      and service_duration_minutes <= 1440
    );

comment on column public.bookings.service_duration_minutes is
  'Minutes the vehicle is considered blocked after pickup (overlap guard). Default 2h.';

create index if not exists bookings_vehicle_active_pickup_idx on public.bookings (
  vehicle_id,
  pickup_datetime
)
where
  vehicle_id is not null
  and status in ('pending', 'confirmed', 'assigned', 'in_progress');

-- -----------------------------------------------------------------------------
-- 2. No overlapping active bookings for the same physical vehicle
-- -----------------------------------------------------------------------------

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

drop trigger if exists trg_bookings_vehicle_overlap on public.bookings;

create trigger trg_bookings_vehicle_overlap
before insert or update on public.bookings
for each row
execute function public.bookings_enforce_vehicle_no_overlap ();

-- -----------------------------------------------------------------------------
-- 3. Clients cannot self-escalate lifecycle / payment / assignment via REST
-- -----------------------------------------------------------------------------

create or replace function public.enforce_client_booking_mutation ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
  finalize text;
begin
  select p.role into user_role
  from public.profiles p
  where p.id = auth.uid ();

  if user_role is distinct from 'client' then
    return new;
  end if;

  if old.client_id is distinct from auth.uid () then
    return new;
  end if;

  finalize := current_setting('velox.booking_finalize', true);
  if finalize = '1' then
    return new;
  end if;

  if new.client_id is distinct from old.client_id then
    raise exception 'Clients cannot reassign booking ownership';
  end if;

  if new.driver_id is distinct from old.driver_id then
    raise exception 'Clients cannot change driver assignment';
  end if;

  if new.final_price is distinct from old.final_price then
    raise exception 'Clients cannot set final_price';
  end if;

  if new.payment_method is distinct from old.payment_method then
    raise exception 'Clients cannot change payment_method';
  end if;

  if new.status is distinct from old.status then
    if new.status = 'cancelled' and old.status = 'pending' then
      return new;
    end if;
    raise exception 'Clients cannot change booking status directly';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_bookings_client_guard on public.bookings;

create trigger trg_bookings_client_guard
before update on public.bookings
for each row
execute function public.enforce_client_booking_mutation ();

-- -----------------------------------------------------------------------------
-- 4. Profile role changes only by admins (prevents self-promotion to admin)
-- -----------------------------------------------------------------------------

create or replace function public.enforce_profile_role_lock ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if auth.uid () is null then
    return new;
  end if;

  if old.role is distinct from new.role then
    if not exists (
      select 1
      from public.profiles p
      where
        p.id = auth.uid ()
        and p.role = 'admin'
    ) then
      raise exception 'Only admins can change profile roles';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_role_lock on public.profiles;

create trigger trg_profiles_role_lock
before update on public.profiles
for each row
execute function public.enforce_profile_role_lock ();

-- -----------------------------------------------------------------------------
-- 5. Cash confirmation RPC — allow finalize through client guard
-- -----------------------------------------------------------------------------

create or replace function public.confirm_booking_cash (p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.bookings;
begin
  perform set_config('velox.booking_finalize', '1', true);

  update public.bookings b
  set
    status = 'confirmed',
    payment_method = 'cash',
    updated_at = now()
  where
    b.id = p_booking_id
    and b.client_id = auth.uid ()
    and b.status = 'pending'
    and b.payment_method = 'stripe'
  returning * into result;

  if not found then
    raise exception 'Cannot confirm cash for this booking';
  end if;

  return result;
end;
$$;

comment on function public.confirm_booking_cash (uuid) is
  'Sets booking to confirmed + cash pay; caller must own the booking and it must be pending.';

grant execute on function public.confirm_booking_cash (uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. New signups are always clients (role escalation only via admin profile update)
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
    'client'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;

  return new;
end;
$$;

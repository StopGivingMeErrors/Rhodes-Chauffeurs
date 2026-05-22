-- Prevent reactivating client-cancelled (or ops-cancelled) bookings.

create or replace function public.enforce_booking_status_transition ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.status is not distinct from new.status then
    return new;
  end if;

  if old.status = 'cancelled' then
    raise exception 'Cancelled reservations cannot be reactivated. Create a new booking if the guest still needs transport.';
  end if;

  if old.status = 'completed' and new.status is distinct from 'completed' then
    raise exception 'Completed bookings cannot change status.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_bookings_status_transition on public.bookings;

create trigger trg_bookings_status_transition
before update on public.bookings
for each row
execute function public.enforce_booking_status_transition ();

comment on function public.enforce_booking_status_transition () is
  'Blocks status changes from cancelled/completed except staying in the same terminal state.';

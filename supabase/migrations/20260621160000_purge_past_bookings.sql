-- Remove reservations whose pickup calendar day is before today (keeps dashboards lean).

create or replace function public.purge_bookings_before_today ()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  if not (select public.current_user_is_admin ()) then
    raise exception 'Only admins can purge past bookings';
  end if;

  with deleted as (
    delete from public.bookings b
    where
      (b.pickup_datetime at time zone 'Europe/Athens')::date < (now() at time zone 'Europe/Athens')::date
    returning b.id
  )
  select count(*)::integer into removed from deleted;

  return coalesce(removed, 0);
end;
$$;

comment on function public.purge_bookings_before_today () is
  'Deletes bookings with pickup before today (UTC day). Admin-only; payments cascade.';

grant execute on function public.purge_bookings_before_today () to authenticated;

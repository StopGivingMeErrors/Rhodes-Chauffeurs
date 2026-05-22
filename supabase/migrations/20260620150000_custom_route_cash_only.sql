-- Custom-route bookings: cash to driver only (created with payment_method = cash).

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
    and (
      b.payment_method = 'stripe'
      or (b.payment_method = 'cash' and b.booking_type = 'custom')
    )
  returning * into result;

  if not found then
    raise exception 'Cannot confirm cash for this booking';
  end if;

  return result;
end;
$$;

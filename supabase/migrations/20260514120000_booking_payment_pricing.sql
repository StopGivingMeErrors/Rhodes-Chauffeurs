-- Payment method, pricing mode, and secure cash confirmation for bookings.

alter table public.bookings
  add column if not exists payment_method text not null default 'stripe'
    check (payment_method in ('stripe', 'cash'));

alter table public.bookings
  add column if not exists pricing_mode text not null default 'distance_vehicle'
    check (pricing_mode in ('distance_vehicle', 'popular_fixed', 'zone_matrix'));

comment on column public.bookings.payment_method is 'stripe: card via PaymentIntent; cash: pay driver / on arrival.';
comment on column public.bookings.pricing_mode is 'How estimated_price was derived: vehicle+distance, fixed popular route, or island zone matrix.';

-- Client confirms a pending booking as cash pay (no Stripe PI). Security definer bypasses RLS.
create or replace function public.confirm_booking_cash (p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.bookings;
begin
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

comment on function public.confirm_booking_cash (uuid) is 'Sets booking to confirmed + cash pay; caller must own the booking and it must be pending.';

grant execute on function public.confirm_booking_cash (uuid) to authenticated;

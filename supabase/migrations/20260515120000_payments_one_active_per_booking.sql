-- At most one in-flight or completed card payment row per booking (prevents multiple
-- PaymentIntents / double charge if the client retries checkout aggressively).

-- Remove duplicate pending rows for the same booking (keep the newest).
delete from public.payments p1
using public.payments p2
where
  p1.booking_id = p2.booking_id
  and p1.status = 'pending'
  and p2.status = 'pending'
  and p1.created_at < p2.created_at;

create unique index if not exists payments_one_active_per_booking
on public.payments (booking_id)
where status in ('pending', 'succeeded');

comment on index public.payments_one_active_per_booking is
  'Ensures a booking cannot have two pending or succeeded Stripe payment rows at once.';

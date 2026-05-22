-- `driver_id` references `company_drivers`, not `auth.users`. The old
-- `driver_id = auth.uid()` branch never matched real drivers and added noise.
-- Clients see rows where they are the payer; admins see all.

drop policy if exists "bookings_select_policy" on public.bookings;

create policy "bookings_select_policy"
on public.bookings
for select
to authenticated
using (
  (select public.current_user_is_admin ())
  or client_id = (select auth.uid ())
);

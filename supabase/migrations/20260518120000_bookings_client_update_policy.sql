-- Restore client updates on own bookings (dropped during profiles RLS refactor).
-- Without this, PATCH pending bookings from the wizard fails; INSERT can still fail
-- on overlap / constraints, but clients must be able to refresh draft rows.

drop policy if exists "bookings_update_client_own" on public.bookings;

create policy "bookings_update_client_own"
on public.bookings
for update
to authenticated
using (client_id = (select auth.uid ()))
with check (client_id = (select auth.uid ()));

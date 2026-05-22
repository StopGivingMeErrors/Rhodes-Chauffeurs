-- Clients may read chauffeur name/phone only when assigned to their own booking.
drop policy if exists "company_drivers_select_client_assigned" on public.company_drivers;

create policy "company_drivers_select_client_assigned"
on public.company_drivers
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings b
    where b.driver_id = company_drivers.id
      and b.client_id = auth.uid()
      and b.driver_id is not null
  )
);

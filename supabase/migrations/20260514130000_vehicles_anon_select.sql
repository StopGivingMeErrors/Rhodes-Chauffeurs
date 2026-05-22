-- Allow anonymous (anon) clients to read the public fleet catalog for booking step 2
-- before sign-in. Authenticated users keep the existing broader policy.

drop policy if exists "vehicles_select_anon_available" on public.vehicles;

create policy "vehicles_select_anon_available"
on public.vehicles
for select
to anon
using (available = true);

comment on policy "vehicles_select_anon_available" on public.vehicles is
  'Public catalog: anon role may list vehicles marked available (booking wizard before auth).';

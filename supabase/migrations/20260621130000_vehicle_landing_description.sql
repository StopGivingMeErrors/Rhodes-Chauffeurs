-- Marketing description for vehicle cards on the landing page.

alter table public.vehicles
  add column if not exists description text;

comment on column public.vehicles.description is 'Guest-facing copy on the landing page vehicle card.';

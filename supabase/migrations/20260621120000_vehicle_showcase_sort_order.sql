-- Fleet showcase ordering (which vehicle appears first as "Available now").

alter table public.vehicles
  add column if not exists sort_order int not null default 0;

comment on column public.vehicles.sort_order is 'Lower values appear first in the public showcase.';

update public.vehicles
set
  sort_order = 0
where
  sort_order is null;

-- Fix PostgreSQL error 42P17: infinite recursion in RLS on public.profiles.
-- Policies must not subquery public.profiles directly; that re-evaluates the same
-- policies. Use a SECURITY DEFINER helper so the role check runs as the definer
-- (table owner) and bypasses RLS on profiles.

create or replace function public.current_user_is_admin ()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where
      p.id = (select auth.uid ())
      and p.role = 'admin'
  );
$$;

comment on function public.current_user_is_admin () is
  'True when the JWT subject has role admin in public.profiles; used by RLS to avoid recursive policy checks.';

revoke all on function public.current_user_is_admin () from public;

grant execute on function public.current_user_is_admin () to authenticated;

-- profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;

create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid ())
  or (select public.current_user_is_admin ())
);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;

create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid ())
  or (select public.current_user_is_admin ())
)
with check (
  id = (select auth.uid ())
  or (select public.current_user_is_admin ())
);

-- vehicles
drop policy if exists "vehicles_write_admin" on public.vehicles;

create policy "vehicles_write_admin"
on public.vehicles
for all
to authenticated
using ((select public.current_user_is_admin ()))
with check ((select public.current_user_is_admin ()));

-- bookings
drop policy if exists "bookings_select_policy" on public.bookings;

create policy "bookings_select_policy"
on public.bookings
for select
to authenticated
using (
  (select public.current_user_is_admin ())
  or client_id = (select auth.uid ())
  or driver_id = (select auth.uid ())
);

drop policy if exists "bookings_insert_client_or_admin" on public.bookings;

create policy "bookings_insert_client_or_admin"
on public.bookings
for insert
to authenticated
with check (
  (select public.current_user_is_admin ())
  or client_id = (select auth.uid ())
);

drop policy if exists "bookings_update_admin" on public.bookings;

create policy "bookings_update_admin"
on public.bookings
for update
to authenticated
using ((select public.current_user_is_admin ()))
with check ((select public.current_user_is_admin ()));

drop policy if exists "bookings_delete_admin" on public.bookings;

create policy "bookings_delete_admin"
on public.bookings
for delete
to authenticated
using ((select public.current_user_is_admin ()));

-- payments
drop policy if exists "payments_select_policy" on public.payments;

create policy "payments_select_policy"
on public.payments
for select
to authenticated
using (
  (select public.current_user_is_admin ())
  or exists (
    select 1
    from public.bookings b
    where
      b.id = payments.booking_id
      and b.client_id = (select auth.uid ())
  )
);

drop policy if exists "payments_write_admin" on public.payments;

create policy "payments_write_admin"
on public.payments
for all
to authenticated
using ((select public.current_user_is_admin ()))
with check ((select public.current_user_is_admin ()));

-- Role-lock trigger: same admin predicate without querying profiles under invoker RLS
create or replace function public.enforce_profile_role_lock ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if auth.uid () is null then
    return new;
  end if;

  if old.role is distinct from new.role then
    if not (select public.current_user_is_admin ()) then
      raise exception 'Only admins can change profile roles';
    end if;
  end if;

  return new;
end;
$$;

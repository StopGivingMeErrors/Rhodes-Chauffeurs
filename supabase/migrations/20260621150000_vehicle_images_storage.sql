-- Public bucket for landing-page vehicle photos (admin upload, anon read).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-images',
  'vehicle-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "vehicle_images_public_read" on storage.objects;
create policy "vehicle_images_public_read"
on storage.objects
for select
to public
using (bucket_id = 'vehicle-images');

drop policy if exists "vehicle_images_admin_insert" on storage.objects;
create policy "vehicle_images_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vehicle-images'
  and (select public.current_user_is_admin ())
);

drop policy if exists "vehicle_images_admin_update" on storage.objects;
create policy "vehicle_images_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'vehicle-images'
  and (select public.current_user_is_admin ())
)
with check (
  bucket_id = 'vehicle-images'
  and (select public.current_user_is_admin ())
);

drop policy if exists "vehicle_images_admin_delete" on storage.objects;
create policy "vehicle_images_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'vehicle-images'
  and (select public.current_user_is_admin ())
);

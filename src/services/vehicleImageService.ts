import { assertSupabaseConfigured, supabase } from '@/services/supabase'

export const VEHICLE_IMAGES_BUCKET = 'vehicle-images'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function extensionForMime(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}

export function validateVehicleImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'Use a JPEG, PNG, WebP, or GIF image.'
  }
  if (file.size > MAX_BYTES) {
    return 'Image must be 5 MB or smaller.'
  }
  return null
}

/**
 * Upload a vehicle photo to Supabase Storage and return its public URL.
 */
export async function uploadVehicleImage(file: File, vehicleId?: string): Promise<string> {
  assertSupabaseConfigured()
  const err = validateVehicleImageFile(file)
  if (err) {
    throw new Error(err)
  }

  const ext = extensionForMime(file.type)
  const folder = vehicleId?.trim() || `draft/${crypto.randomUUID()}`
  const path = `${folder}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage.from(VEHICLE_IMAGES_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data } = supabase.storage.from(VEHICLE_IMAGES_BUCKET).getPublicUrl(path)
  if (!data.publicUrl) {
    throw new Error('Could not resolve public URL for uploaded image.')
  }
  return data.publicUrl
}

/** Best-effort remove of a stored object when its public URL points at our bucket. */
export async function removeVehicleImageByPublicUrl(publicUrl: string | null | undefined): Promise<void> {
  if (!publicUrl?.trim()) {
    return
  }
  assertSupabaseConfigured()
  const marker = `/storage/v1/object/public/${VEHICLE_IMAGES_BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx < 0) {
    return
  }
  const path = decodeURIComponent(publicUrl.slice(idx + marker.length).split('?')[0] ?? '')
  if (!path) {
    return
  }
  const { error } = await supabase.storage.from(VEHICLE_IMAGES_BUCKET).remove([path])
  if (error) {
    console.warn('[vehicleImage] remove failed', error.message)
  }
}

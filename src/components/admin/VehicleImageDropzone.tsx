import { ImagePlus, Loader2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { uploadVehicleImage, validateVehicleImageFile } from '@/services/vehicleImageService'
import { cn } from '@/utils/cn'

type VehicleImageDropzoneProps = {
  imageUrl: string | null
  vehicleId?: string
  disabled?: boolean
  onUploaded: (publicUrl: string) => void
  className?: string
}

export function VehicleImageDropzone({
  imageUrl,
  vehicleId,
  disabled,
  onUploaded,
  className,
}: VehicleImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadFile = useCallback(
    async (file: File) => {
      const validation = validateVehicleImageFile(file)
      if (validation) {
        setError(validation)
        return
      }
      setError(null)
      setUploading(true)
      try {
        const url = await uploadVehicleImage(file, vehicleId)
        onUploaded(url)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed.')
      } finally {
        setUploading(false)
      }
    },
    [onUploaded, vehicleId],
  )

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (disabled || uploading) {
      return
    }
    const file = e.dataTransfer.files?.[0]
    if (file) {
      void uploadFile(file)
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-velox-muted">Photo</span>
      <div
        role="button"
        tabIndex={disabled || uploading ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onClick={() => {
          if (!disabled && !uploading) {
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled && !uploading) {
            setDragOver(true)
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'relative aspect-[16/10] w-full overflow-hidden rounded-xl border-2 border-dashed transition',
          dragOver ? 'border-velox-gold/60 bg-velox-gold/10' : 'border-white/15 bg-white/[0.03]',
          !disabled && !uploading && 'cursor-pointer hover:border-velox-gold/40 hover:bg-white/[0.06]',
          (disabled || uploading) && 'pointer-events-none opacity-60',
        )}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <ImagePlus className="h-8 w-8 text-velox-gold-light/80" aria-hidden />
            <p className="text-xs text-white/55">Drag &amp; drop a photo here, or click to browse</p>
          </div>
        )}
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
            <Loader2 className="h-8 w-8 animate-spin text-velox-gold-light" aria-hidden />
            <span className="sr-only">Uploading</span>
          </div>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            void uploadFile(file)
          }
          e.target.value = ''
        }}
      />
      <p className="text-[11px] text-velox-muted">JPEG, PNG, or WebP · max 5 MB · shown on the landing page</p>
      {error ? <p className="text-xs text-red-200">{error}</p> : null}
    </div>
  )
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { VehicleImageDropzone } from '@/components/admin/VehicleImageDropzone'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { Switch } from '@/components/ui/Switch'
import { useAdminVehiclesList } from '@/hooks/useAdminDashboard'
import { useToast } from '@/hooks/useToast'
import { createVehicleAdmin, deleteVehicleAdmin, updateVehicleFleet } from '@/services/bookingService'
import type { Vehicle, VehicleInput } from '@/types/vehicle'
import { cn } from '@/utils/cn'
import { QUERY_KEYS } from '@/utils/constants'

const textareaClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-velox-gold/50 focus:bg-white/[0.07] focus:ring-1 focus:ring-velox-gold/25'

function FleetVehicleCard({
  vehicle,
  onPatch,
  onDelete,
  busy,
}: {
  vehicle: Vehicle
  onPatch: (patch: Partial<Pick<Vehicle, 'available' | 'name' | 'description' | 'imageUrl' | 'sortOrder'>>) => void
  onDelete: () => void
  busy: boolean
}) {
  const [name, setName] = useState(vehicle.name)
  const [description, setDescription] = useState(vehicle.description ?? '')
  const [sortOrder, setSortOrder] = useState(String(vehicle.sortOrder))

  return (
    <Card hoverGlow className="flex flex-col overflow-hidden p-0">
      <div className="p-4 pb-0">
        <VehicleImageDropzone
          imageUrl={vehicle.imageUrl}
          vehicleId={vehicle.id}
          disabled={busy}
          onUploaded={(url) => onPatch({ imageUrl: url })}
        />
      </div>
      <div className="space-y-4 p-5 pt-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-white/80">Εμφάνιση στην αρχική</span>
          <Switch
            checked={vehicle.available}
            disabled={busy}
            aria-label={`Εμφάνιση ${vehicle.name} στην αρχική`}
            onCheckedChange={(checked) => onPatch({ available: checked })}
          />
        </div>
        <Input
          label="Τίτλος"
          value={name}
          disabled={busy}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            const t = name.trim()
            if (t && t !== vehicle.name) {
              onPatch({ name: t })
            }
          }}
        />
        <label className="block space-y-1.5 text-left">
          <span className="text-xs font-medium uppercase tracking-wide text-velox-muted">Περιγραφή</span>
          <textarea
            className={cn(textareaClass, 'min-h-[88px] resize-y')}
            rows={3}
            value={description}
            disabled={busy}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              const t = description.trim()
              if (t !== (vehicle.description ?? '')) {
                onPatch({ description: t || null })
              }
            }}
          />
        </label>
        <Input
          label="Σειρά εμφάνισης"
          type="number"
          value={sortOrder}
          disabled={busy}
          onChange={(e) => setSortOrder(e.target.value)}
          onBlur={() => {
            const n = Number.parseInt(sortOrder, 10)
            if (!Number.isFinite(n)) {
              setSortOrder(String(vehicle.sortOrder))
              return
            }
            if (n !== vehicle.sortOrder) {
              onPatch({ sortOrder: n })
            }
          }}
        />
        <p className="text-[11px] text-velox-muted">Μικρότεροι αριθμοί εμφανίζονται πρώτοι στην αρχική.</p>
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="w-full"
          disabled={busy}
          leftIcon={<Trash2 className="h-4 w-4" />}
          onClick={onDelete}
        >
          Αφαίρεση κάρτας
        </Button>
      </div>
    </Card>
  )
}

export function AdminFleetPanel() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { data: vehicles = [], isLoading, error } = useAdminVehiclesList()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  const invalidateFleet = () => {
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.adminVehicles })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.vehicles })
  }

  const nextSortOrder = vehicles.reduce((max, v) => Math.max(max, v.sortOrder), -1) + 1

  const patchMutation = useMutation({
    retry: 0,
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<Pick<Vehicle, 'available' | 'name' | 'description' | 'imageUrl' | 'sortOrder'>>
    }) => updateVehicleFleet(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.adminVehicles })
      const prev = qc.getQueryData<Vehicle[]>(QUERY_KEYS.adminVehicles)
      qc.setQueryData<Vehicle[]>(QUERY_KEYS.adminVehicles, (old) =>
        old?.map((v) => (v.id === id ? { ...v, ...patch } : v)) ?? [],
      )
      return { prev }
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(QUERY_KEYS.adminVehicles, ctx.prev)
      }
      toast({
        variant: 'error',
        title: 'Η ενημέρωση απέτυχε',
        description: err instanceof Error ? err.message : undefined,
      })
    },
    onSuccess: () => {
      toast({ variant: 'success', title: 'Η κάρτα ενημερώθηκε' })
    },
    onSettled: invalidateFleet,
  })

  const createMutation = useMutation({
    retry: 0,
    mutationFn: (input: VehicleInput) => createVehicleAdmin(input),
    onSuccess: () => {
      setTitle('')
      setDescription('')
      setImageUrl('')
      toast({ variant: 'success', title: 'Προστέθηκε κάρτα στην αρχική' })
      invalidateFleet()
    },
    onError: (err) => {
      toast({
        variant: 'error',
        title: 'Δεν προστέθηκε κάρτα',
        description: err instanceof Error ? err.message : undefined,
      })
    },
  })

  const deleteMutation = useMutation({
    retry: 0,
    mutationFn: (id: string) => deleteVehicleAdmin(id),
    onSuccess: () => {
      toast({ variant: 'success', title: 'Η κάρτα αφαιρέθηκε' })
      invalidateFleet()
    },
    onError: (err) => {
      toast({
        variant: 'error',
        title: 'Δεν αφαιρέθηκε η κάρτα',
        description: err instanceof Error ? err.message : undefined,
      })
    },
  })

  function handleCreate() {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      toast({ variant: 'error', title: 'Εισάγετε τίτλο οχήματος' })
      return
    }
    if (!imageUrl.trim()) {
      toast({ variant: 'error', title: 'Προσθέστε φωτογραφία' })
      return
    }
    createMutation.mutate({
      name: trimmedTitle,
      description: description.trim() || null,
      imageUrl: imageUrl.trim(),
      available: true,
      sortOrder: nextSortOrder,
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Spinner label="Φόρτωση καρτών οχημάτων" />
      </div>
    )
  }

  if (error) {
    return (
      <Card title="Οχήματα αρχικής">
        <p className="text-sm text-red-200">{error instanceof Error ? error.message : 'Σφάλμα'}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-velox-muted">
        Οι κάρτες εμφανίζονται στην <span className="text-white/80">αρχική σελίδα</span>. Σύρετε φωτογραφία — χωρίς URL.
        Οι τιμές δρομολογίων είναι στις Διαδρομές &amp; τιμές.
      </p>

      <Card title="Νέα κάρτα οχήματος" description="Τίτλος, περιγραφή και φωτογραφία (σύρετε ή επιλέξτε αρχείο).">
        <div className="grid gap-3">
          <Input
            label="Τίτλος"
            placeholder="π.χ. Mercedes V-Class VIP"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label className="block space-y-1.5 text-left">
            <span className="text-xs font-medium uppercase tracking-wide text-velox-muted">Περιγραφή</span>
            <textarea
              className={cn(textareaClass, 'min-h-[100px] resize-y')}
              rows={4}
              placeholder="Λίγες γραμμές για άνεση, αποσκευές, τύπο ταξιδιού…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <VehicleImageDropzone imageUrl={imageUrl || null} disabled={createMutation.isPending} onUploaded={setImageUrl} />
        </div>
        <Button
          type="button"
          className="mt-4"
          disabled={createMutation.isPending}
          isLoading={createMutation.isPending}
          onClick={handleCreate}
        >
          Προσθήκη στην αρχική
        </Button>
      </Card>

      <div className={cn('grid gap-6', vehicles.length ? 'md:grid-cols-2 xl:grid-cols-3' : '')}>
        {vehicles.length === 0 ? (
          <Card title="Δεν υπάρχουν κάρτες">
            <p className="text-sm text-velox-muted">Προσθέστε το πρώτο όχημα από πάνω — θα εμφανιστεί στην αρχική.</p>
          </Card>
        ) : (
          vehicles.map((v) => (
            <FleetVehicleCard
              key={v.id}
              vehicle={v}
              busy={
                (patchMutation.isPending && patchMutation.variables?.id === v.id) ||
                (deleteMutation.isPending && deleteMutation.variables === v.id)
              }
              onPatch={(patch) => patchMutation.mutate({ id: v.id, patch })}
              onDelete={() => {
                if (window.confirm(`Αφαίρεση της κάρτας «${v.name}» από την αρχική;`)) {
                  deleteMutation.mutate(v.id)
                }
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}

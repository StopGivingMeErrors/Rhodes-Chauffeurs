import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAdminBookingsList, useAdminDriversList, useAdminVehiclesList } from '@/hooks/useAdminDashboard'
import { useToast } from '@/hooks/useToast'
import {
  assignBookingDriver,
  assignBookingVehicle,
  requestBookingCancelledClientEmail,
  requestRideConfirmedClientEmail,
  updateBookingStatus,
} from '@/services/bookingService'
import type { BookingStatus, BookingWithVehicle } from '@/types/booking'
import { adminBookingStatusLabel, bookingRouteLabel } from '@/utils/adminBookingOps'
import {
  ADMIN_BOOKING_STATUS_FILTERS,
  adminSimplifiedStatusLabel,
  bookingMatchesAdminStatusFilter,
  type AdminBookingStatusFilter,
} from '@/utils/adminBookingStatus'
import { format } from 'date-fns'
import { el } from 'date-fns/locale'
import { cn } from '@/utils/cn'
import { QUERY_KEYS } from '@/utils/constants'
import {
  ADMIN_RECENT_BOOKINGS_DAYS,
  filterBookingsByPickupWindow,
  getPickupBoundsForTimePreset,
  type AdminBookingsTimePreset,
} from '@/utils/adminBookingFilters'
import { buildBookingsPdfFilterLabelEn, downloadBookingsPdf } from '@/utils/exportBookingsPdf'

function formatPickupDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return iso
  }
  return format(d, "EEE d MMM yyyy '·' HH:mm", { locale: el })
}

type SortKey = 'pickup' | 'route' | 'passengers' | 'client'
type SortDir = 'asc' | 'desc'

const selectClass =
  'w-full min-h-[44px] rounded-xl border border-white/12 bg-black/45 py-2.5 pr-9 pl-3 text-sm text-white focus:border-velox-gold/40 focus:outline-none focus:ring-1 focus:ring-velox-gold/30'

const TIME_PRESETS: { id: Exclude<AdminBookingsTimePreset, 'custom'>; label: string }[] = [
  { id: 'upcoming', label: 'Επερχόμενες' },
  { id: 'today', label: 'Σήμερα' },
  { id: 'recent', label: `Πρόσφατες (${ADMIN_RECENT_BOOKINGS_DAYS} ημ.)` },
  { id: 'all', label: 'Όλες (βάση)' },
]

function sortBookings(rows: BookingWithVehicle[], key: SortKey, dir: SortDir): BookingWithVehicle[] {
  const m = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (key === 'pickup') {
      return (new Date(a.pickupDatetime).getTime() - new Date(b.pickupDatetime).getTime()) * m
    }
    if (key === 'route') {
      return bookingRouteLabel(a).localeCompare(bookingRouteLabel(b)) * m
    }
    if (key === 'passengers') {
      return (a.passengers - b.passengers) * m
    }
    const ea = a.clientEmail ?? ''
    const eb = b.clientEmail ?? ''
    return ea.localeCompare(eb) * m
  })
}

function SortHead({
  label,
  col,
  sortKey,
  sortDir,
  onToggle,
}: {
  label: string
  col: SortKey
  sortKey: SortKey
  sortDir: SortDir
  onToggle: (col: SortKey) => void
}) {
  const active = sortKey === col
  return (
    <button
      type="button"
      onClick={() => onToggle(col)}
      className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-velox-muted hover:text-white"
    >
      {label}
      {active ? (
        sortDir === 'asc' ? (
          <ArrowUp className="h-3 w-3" aria-hidden />
        ) : (
          <ArrowDown className="h-3 w-3" aria-hidden />
        )
      ) : null}
    </button>
  )
}

function isBookingOpsLocked(status: BookingWithVehicle['status']): boolean {
  return status === 'cancelled' || status === 'completed'
}

function ClientFlightNumberBlock({
  booking,
  className,
}: {
  booking: BookingWithVehicle
  className?: string
}) {
  const flight = booking.flightNumber?.trim()
  if (!flight) {
    return null
  }
  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-black/30 px-3 py-2.5',
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-velox-muted">Αριθμός πτήσης</p>
      <p className="mt-1.5 font-mono text-sm tracking-wide text-white">{flight}</p>
    </div>
  )
}

function ClientSpecialRequestsBlock({
  booking,
  className,
}: {
  booking: BookingWithVehicle
  className?: string
}) {
  const text = booking.specialRequests?.trim()
  if (!text) {
    return null
  }
  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-black/30 px-3 py-2.5',
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-velox-muted">Ειδικά αιτήματα</p>
      <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-white/80">{text}</p>
    </div>
  )
}

function ClientContactBlock({ booking }: { booking: BookingWithVehicle }) {
  return (
    <div>
      <p className="font-medium text-white">{booking.clientEmail ?? '—'}</p>
      {booking.clientPhone ? (
        <a
          href={`tel:${booking.clientPhone.replace(/\s/g, '')}`}
          className="mt-1 block text-xs text-velox-gold-light hover:underline"
        >
          {booking.clientPhone}
        </a>
      ) : (
        <p className="mt-1 text-xs text-white/40">Χωρίς τηλέφωνο</p>
      )}
      {booking.clientFullName ? (
        <p className="mt-0.5 text-[10px] text-velox-muted">{booking.clientFullName}</p>
      ) : null}
      <p className="mt-1 text-[10px] text-white/45">{adminSimplifiedStatusLabel(booking.status)}</p>
    </div>
  )
}

type BookingDispatchProps = {
  booking: BookingWithVehicle
  locked: boolean
  drivers: { id: string; fullName: string; phone: string | null }[]
  vehicles: { id: string; name: string }[]
  assignDriverPending: boolean
  assignVehiclePending: boolean
  updateStatusPending: boolean
  onAssignDriver: (driverId: string | null) => void
  onAssignVehicle: (vehicleId: string | null) => void
  onConfirm: () => void
  onCancel: () => void
}

function BookingDispatchFields({
  booking,
  locked,
  drivers,
  vehicles,
  assignDriverPending,
  assignVehiclePending,
  updateStatusPending,
  onAssignDriver,
  onAssignVehicle,
  onConfirm,
  onCancel,
}: BookingDispatchProps) {
  const email = booking.clientEmail ?? 'booking'
  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-velox-muted">Ανάθεση οδηγού</span>
        <select
          className={selectClass}
          aria-label={`Assign driver for ${email}`}
          value={booking.driverId ?? ''}
          disabled={locked || assignDriverPending}
          onChange={(e) => onAssignDriver(e.target.value ? e.target.value : null)}
        >
          <option value="">Χωρίς ανάθεση</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.fullName}
              {d.phone ? ` · ${d.phone}` : ''}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-velox-muted">Ανάθεση οχήματος</span>
        <select
          className={selectClass}
          aria-label={`Assign vehicle for ${email}`}
          value={booking.vehicleId ?? ''}
          disabled={locked || assignVehiclePending}
          onChange={(e) => onAssignVehicle(e.target.value ? e.target.value : null)}
        >
          <option value="">Χωρίς ανάθεση</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      {locked ? (
        <span
          className={cn(
            'inline-block rounded-lg border px-3 py-2 text-sm font-medium capitalize',
            booking.status === 'cancelled'
              ? 'border-red-400/35 bg-red-500/10 text-red-200'
              : 'border-white/15 bg-white/5 text-white/70',
          )}
        >
          {adminBookingStatusLabel(booking.status)}
        </span>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="success"
            size="md"
            className="min-h-[44px] w-full text-sm"
            disabled={updateStatusPending || booking.status === 'confirmed'}
            isLoading={updateStatusPending}
            onClick={onConfirm}
          >
            Επιβεβαίωση διαδρομής
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            className="min-h-[44px] w-full text-sm"
            disabled={updateStatusPending}
            isLoading={updateStatusPending}
            onClick={onCancel}
          >
            Ακύρωση διαδρομής
          </Button>
        </div>
      )}
    </div>
  )
}

export function AdminBookingsPanel() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { data: bookings = [], isLoading, error, refetch, isFetching } = useAdminBookingsList()
  const { data: drivers = [] } = useAdminDriversList()
  const { data: vehicles = [] } = useAdminVehiclesList()

  const [statusFilter, setStatusFilter] = useState<AdminBookingStatusFilter>('all')
  const [timePreset, setTimePreset] = useState<AdminBookingsTimePreset>('upcoming')
  const [dateFrom, setDateFrom] = useState(() => getPickupBoundsForTimePreset('upcoming').from)
  const [dateTo, setDateTo] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('pickup')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const applyTimePreset = (preset: Exclude<AdminBookingsTimePreset, 'custom'>) => {
    setTimePreset(preset)
    const bounds = getPickupBoundsForTimePreset(preset)
    setDateFrom(bounds.from)
    setDateTo(bounds.to)
  }

  const filtered = useMemo(() => {
    const byDate = filterBookingsByPickupWindow(bookings, dateFrom, dateTo)
    return byDate.filter((b) => bookingMatchesAdminStatusFilter(b.status, statusFilter))
  }, [bookings, statusFilter, dateFrom, dateTo])

  const sorted = useMemo(() => sortBookings(filtered, sortKey, sortDir), [filtered, sortKey, sortDir])

  const updateStatus = useMutation({
    retry: 0,
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) => updateBookingStatus(id, status),
    onSuccess: async (_booking, vars) => {
      toast({ variant: 'success', title: 'Η κράτηση ενημερώθηκε' })
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.adminBookings })
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.adminKpis })
      if (vars.status === 'cancelled') {
        try {
          await requestBookingCancelledClientEmail(vars.id)
          toast({
            variant: 'success',
            title: 'Email ακύρωσης εστάλη',
            description: 'Ο πελάτης ενημερώθηκε με email.',
          })
        } catch (e) {
          toast({
            variant: 'error',
            title: 'Η κατάσταση αποθηκεύτηκε, το email απέτυχε',
            description:
              e instanceof Error
                ? e.message
                : 'Ελέγξτε RESEND_API_KEY και RESEND_FROM στα secrets των Edge Functions.',
          })
        }
      }
    },
    onError: (e) => {
      toast({
        variant: 'error',
        title: 'Δεν ενημερώθηκε η κράτηση',
        description: e instanceof Error ? e.message : undefined,
      })
    },
  })

  const assignDriver = useMutation({
    retry: 0,
    mutationFn: ({ id, driverId }: { id: string; driverId: string | null }) => assignBookingDriver(id, driverId),
    onSuccess: async (_data, vars) => {
      toast({ variant: 'success', title: 'Ανατέθηκε οδηγός' })
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.adminBookings })
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.adminKpis })
      if (vars.driverId) {
        await requestRideConfirmedClientEmail(vars.id)
      }
    },
    onError: (e) => {
      toast({
        variant: 'error',
        title: 'Δεν ανατέθηκε οδηγός',
        description: e instanceof Error ? e.message : undefined,
      })
    },
  })

  const assignVehicle = useMutation({
    retry: 0,
    mutationFn: ({ id, vehicleId }: { id: string; vehicleId: string | null }) =>
      assignBookingVehicle(id, vehicleId),
    onSuccess: () => {
      toast({ variant: 'success', title: 'Ανατέθηκε όχημα' })
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.adminBookings })
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.adminKpis })
    },
    onError: (e) => {
      toast({
        variant: 'error',
        title: 'Δεν ανατέθηκε όχημα',
        description: e instanceof Error ? e.message : undefined,
      })
    },
  })

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'pickup' ? 'desc' : 'asc')
    }
  }

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
  }

  if (error) {
    return (
      <Card title="Κρατήσεις">
        <p className="text-sm text-red-200">{error instanceof Error ? error.message : 'Σφάλμα'}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
        <p className="text-xs text-white/50">
          Αναθέστε οδηγό και όχημα, μετά επιβεβαιώστε ή ακυρώστε. Το email πελάτη εμφανίζεται σε κάθε κράτηση.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="text-xs font-medium uppercase tracking-wide text-velox-muted">Περίοδος παραλαβής</span>
          <div className="flex flex-wrap gap-2">
            {TIME_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyTimePreset(p.id)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
                  timePreset === p.id
                    ? 'border-velox-gold/50 bg-velox-gold/15 text-velox-gold-light'
                    : 'border-white/10 bg-black/30 text-white/70 hover:border-white/20 hover:text-white',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-white/45 sm:ml-auto">
            {sorted.length} από {bookings.length} κρατήσεις
          </span>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <label className="grid gap-1 text-xs text-velox-muted">
            Φίλτρο κατάστασης
            <select
              className={selectClass}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AdminBookingStatusFilter)}
            >
              {ADMIN_BOOKING_STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-velox-muted">
            Από
            <input
              type="date"
              className={selectClass}
              value={dateFrom}
              onChange={(e) => {
                setTimePreset('custom')
                setDateFrom(e.target.value)
              }}
            />
          </label>
          <label className="grid gap-1 text-xs text-velox-muted">
            Έως
            <input
              type="date"
              className={selectClass}
              value={dateTo}
              onChange={(e) => {
                setTimePreset('custom')
                setDateTo(e.target.value)
              }}
            />
          </label>
          <div className="flex flex-1 flex-wrap justify-end gap-2 lg:ml-auto">
            <Button type="button" variant="secondary" isLoading={isFetching} onClick={() => void refetch()}>
              Ανανέωση
            </Button>
            <Button
              type="button"
              variant="primary"
              leftIcon={<Download className="h-4 w-4" />}
              disabled={sorted.length === 0}
              onClick={() => {
                const suffix =
                  timePreset === 'custom'
                    ? dateFrom || dateTo
                      ? `${dateFrom || 'start'}-to-${dateTo || 'end'}`
                      : 'filtered'
                    : timePreset
                const filterLabel = buildBookingsPdfFilterLabelEn({
                  statusFilter,
                  timePreset,
                  dateFrom,
                  dateTo,
                  recentDays: ADMIN_RECENT_BOOKINGS_DAYS,
                })
                downloadBookingsPdf(
                  sorted,
                  `rhodes-chauffeurs-bookings-${suffix}-${new Date().toISOString().slice(0, 10)}.pdf`,
                  { filterLabel, generatedAt: new Date() },
                )
                toast({
                  variant: 'success',
                  title: 'Το PDF κατέβηκε',
                  description: `${sorted.length} κράτηση/κρατήσεις εξήχθησαν για τα αρχεία σας.`,
                })
              }}
            >
              {`Εξαγωγή PDF (${sorted.length})`}
            </Button>
          </div>
        </div>
      </div>

      {/* Phone / tablet: stacked cards (no horizontal scroll) */}
      <div className="space-y-3 lg:hidden">
        {sorted.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-velox-muted">
            Δεν βρέθηκαν κρατήσεις με αυτά τα φίλτρα.
          </p>
        ) : (
          sorted.map((b) => {
            const locked = isBookingOpsLocked(b.status)
            return (
              <article
                key={b.id}
                className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-lg shadow-black/30"
              >
                <ClientContactBlock booking={b} />
                <ClientFlightNumberBlock booking={b} />
                <ClientSpecialRequestsBlock booking={b} />
                <div className="text-xs text-white/85">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-velox-muted">Διαδρομή</p>
                  <p className="mt-1">{bookingRouteLabel(b)}</p>
                </div>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-velox-muted">Παραλαβή</p>
                    <p className="mt-1 text-white">{formatPickupDateTime(b.pickupDatetime)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-velox-muted">Επιβάτες</p>
                    <p className="mt-1 text-white">{b.passengers}</p>
                  </div>
                </div>
                <BookingDispatchFields
                  booking={b}
                  locked={locked}
                  drivers={drivers}
                  vehicles={vehicles}
                  assignDriverPending={assignDriver.isPending && assignDriver.variables?.id === b.id}
                  assignVehiclePending={assignVehicle.isPending && assignVehicle.variables?.id === b.id}
                  updateStatusPending={updateStatus.isPending && updateStatus.variables?.id === b.id}
                  onAssignDriver={(driverId) => void assignDriver.mutateAsync({ id: b.id, driverId })}
                  onAssignVehicle={(vehicleId) => void assignVehicle.mutateAsync({ id: b.id, vehicleId })}
                  onConfirm={() => {
                    if (b.status === 'confirmed') return
                    void updateStatus.mutateAsync({ id: b.id, status: 'confirmed' })
                  }}
                  onCancel={() => void updateStatus.mutateAsync({ id: b.id, status: 'cancelled' })}
                />
              </article>
            )
          })
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-white/10 bg-white/5 shadow-xl shadow-black/40 backdrop-blur-xl lg:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-velox-muted">
            <tr>
              <th className="px-3 py-3 font-medium">
                <SortHead label="Πελάτης" col="client" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              </th>
              <th className="px-3 py-3 font-medium">
                <SortHead label="Διαδρομή" col="route" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              </th>
              <th className="px-3 py-3 font-medium">
                <SortHead label="Παραλαβή" col="pickup" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              </th>
              <th className="px-3 py-3 font-medium">
                <SortHead
                  label="Επιβάτες"
                  col="passengers"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                />
              </th>
              <th className="px-3 py-3 font-medium">Ανάθεση οδηγού</th>
              <th className="px-3 py-3 font-medium">Ανάθεση οχήματος</th>
              <th className="px-3 py-3 font-medium">Επιβεβαίωση / ακύρωση</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-velox-muted">
                  Δεν βρέθηκαν κρατήσεις με αυτά τα φίλτρα.
                </td>
              </tr>
            ) : (
              sorted.map((b) => {
                const locked = isBookingOpsLocked(b.status)
                return (
                  <tr key={b.id} className="border-t border-white/10 align-top hover:bg-white/5">
                    <td className="max-w-[14rem] px-3 py-3 text-xs">
                      <ClientContactBlock booking={b} />
                      <ClientFlightNumberBlock booking={b} className="mt-2" />
                      <ClientSpecialRequestsBlock booking={b} className="mt-2" />
                    </td>
                    <td className="max-w-[220px] px-3 py-3 text-xs text-white/85">
                      <div className="line-clamp-3">{bookingRouteLabel(b)}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-white">
                      {formatPickupDateTime(b.pickupDatetime)}
                    </td>
                    <td className="px-3 py-3 text-xs text-white">{b.passengers}</td>
                    <td className="min-w-[12rem] px-3 py-3">
                      <select
                        className={selectClass}
                        aria-label={`Assign driver for ${b.clientEmail ?? 'booking'}`}
                        value={b.driverId ?? ''}
                        disabled={
                          locked || (assignDriver.isPending && assignDriver.variables?.id === b.id)
                        }
                        onChange={(e) => {
                          const v = e.target.value
                          void assignDriver.mutateAsync({ id: b.id, driverId: v ? v : null })
                        }}
                      >
                        <option value="">Χωρίς ανάθεση</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.fullName}
                            {d.phone ? ` · ${d.phone}` : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="min-w-[12rem] px-3 py-3">
                      <select
                        className={selectClass}
                        aria-label={`Assign vehicle for ${b.clientEmail ?? 'booking'}`}
                        value={b.vehicleId ?? ''}
                        disabled={
                          locked || (assignVehicle.isPending && assignVehicle.variables?.id === b.id)
                        }
                        onChange={(e) => {
                          const v = e.target.value
                          void assignVehicle.mutateAsync({ id: b.id, vehicleId: v ? v : null })
                        }}
                      >
                        <option value="">Χωρίς ανάθεση</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="min-w-[14rem] px-3 py-3">
                      {locked ? (
                        <span
                          className={cn(
                            'inline-block rounded-lg border px-3 py-2 text-sm font-medium capitalize',
                            b.status === 'cancelled'
                              ? 'border-red-400/35 bg-red-500/10 text-red-200'
                              : 'border-white/15 bg-white/5 text-white/70',
                          )}
                        >
                          {adminBookingStatusLabel(b.status)}
                        </span>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <Button
                            type="button"
                            variant="success"
                            size="md"
                            className="min-h-[44px] w-full whitespace-nowrap text-sm"
                            disabled={
                              updateStatus.isPending && updateStatus.variables?.id === b.id
                            }
                            isLoading={
                              updateStatus.isPending &&
                              updateStatus.variables?.id === b.id &&
                              updateStatus.variables?.status === 'confirmed'
                            }
                            onClick={() => {
                              if (b.status === 'confirmed') return
                              void updateStatus.mutateAsync({ id: b.id, status: 'confirmed' })
                            }}
                          >
                            Επιβεβαίωση διαδρομής
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="md"
                            className="min-h-[44px] w-full whitespace-nowrap text-sm"
                            disabled={
                              updateStatus.isPending && updateStatus.variables?.id === b.id
                            }
                            isLoading={
                              updateStatus.isPending &&
                              updateStatus.variables?.id === b.id &&
                              updateStatus.variables?.status === 'cancelled'
                            }
                            onClick={() => void updateStatus.mutateAsync({ id: b.id, status: 'cancelled' })}
                          >
                            Ακύρωση διαδρομής
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

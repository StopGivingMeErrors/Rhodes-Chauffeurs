import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAdminBookingsList, useAdminDriversList } from '@/hooks/useAdminDashboard'
import { useToast } from '@/hooks/useToast'
import {
  assignBookingDriver,
  requestBookingCancelledClientEmail,
  requestRideConfirmedClientEmail,
  updateBookingStatus,
} from '@/services/bookingService'
import { bookingChargeAmount } from '@/types/booking'
import type { BookingStatus, BookingWithVehicle } from '@/types/booking'
import { ALL_BOOKING_STATUSES } from '@/utils/bookingStatus'
import { adminSelectableStatuses } from '@/utils/bookingStatusTransitions'
import { cn } from '@/utils/cn'
import { QUERY_KEYS } from '@/utils/constants'
import {
  ADMIN_RECENT_BOOKINGS_DAYS,
  filterBookingsByPickupWindow,
  getPickupBoundsForTimePreset,
  type AdminBookingsTimePreset,
} from '@/utils/adminBookingFilters'
import { downloadBookingsCsv } from '@/utils/exportBookingsCsv'
import { formatCurrencyMajor, formatDateTime } from '@/utils/formatters'

type SortKey = 'pickup' | 'status' | 'vehicle' | 'total'
type SortDir = 'asc' | 'desc'

const selectClass =
  'rounded-lg border border-white/12 bg-black/45 py-1.5 pr-8 pl-2 text-xs text-white focus:border-velox-gold/40 focus:outline-none focus:ring-1 focus:ring-velox-gold/30'

const TIME_PRESETS: { id: Exclude<AdminBookingsTimePreset, 'custom'>; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'today', label: 'Today' },
  { id: 'recent', label: `Recent (${ADMIN_RECENT_BOOKINGS_DAYS}d)` },
  { id: 'all', label: 'All (in DB)' },
]

function sortBookings(rows: BookingWithVehicle[], key: SortKey, dir: SortDir): BookingWithVehicle[] {
  const m = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (key === 'pickup') {
      return (new Date(a.pickupDatetime).getTime() - new Date(b.pickupDatetime).getTime()) * m
    }
    if (key === 'status') {
      return a.status.localeCompare(b.status) * m
    }
    if (key === 'vehicle') {
      return (a.vehicleName ?? '').localeCompare(b.vehicleName ?? '') * m
    }
    const ta = a.finalPrice ?? a.estimatedPrice ?? 0
    const tb = b.finalPrice ?? b.estimatedPrice ?? 0
    return (ta - tb) * m
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

export function AdminBookingsPanel() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { data: bookings = [], isLoading, error, refetch, isFetching } = useAdminBookingsList()
  const { data: drivers = [] } = useAdminDriversList()

  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all')
  const [vehicleFilter, setVehicleFilter] = useState<string>('all')
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

  const vehicleOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of bookings) {
      if (b.vehicleId && b.vehicleName) {
        map.set(b.vehicleId, b.vehicleName)
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [bookings])

  const filtered = useMemo(() => {
    const byDate = filterBookingsByPickupWindow(bookings, dateFrom, dateTo)
    return byDate.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) {
        return false
      }
      if (vehicleFilter !== 'all' && b.vehicleId !== vehicleFilter) {
        return false
      }
      return true
    })
  }, [bookings, statusFilter, vehicleFilter, dateFrom, dateTo])

  const sorted = useMemo(() => sortBookings(filtered, sortKey, sortDir), [filtered, sortKey, sortDir])

  const updateStatus = useMutation({
    retry: 0,
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) => updateBookingStatus(id, status),
    onSuccess: async (_booking, vars) => {
      toast({ variant: 'success', title: 'Status updated' })
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.adminBookings })
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.adminKpis })
      if (vars.status === 'cancelled') {
        try {
          await requestBookingCancelledClientEmail(vars.id)
          toast({
            variant: 'success',
            title: 'Cancellation email sent',
            description: 'The guest was notified by email.',
          })
        } catch (e) {
          toast({
            variant: 'error',
            title: 'Status saved, email failed',
            description:
              e instanceof Error
                ? e.message
                : 'Check RESEND_API_KEY and RESEND_FROM in Supabase Edge Function secrets.',
          })
        }
      }
    },
    onError: (e) => {
      toast({
        variant: 'error',
        title: 'Could not update status',
        description: e instanceof Error ? e.message : undefined,
      })
    },
  })

  const assignDriver = useMutation({
    retry: 0,
    mutationFn: ({ id, driverId }: { id: string; driverId: string | null }) => assignBookingDriver(id, driverId),
    onSuccess: async (_data, vars) => {
      toast({ variant: 'success', title: 'Driver assignment saved' })
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.adminBookings })
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.adminKpis })
      if (vars.driverId) {
        await requestRideConfirmedClientEmail(vars.id)
      }
    },
    onError: (e) => {
      toast({
        variant: 'error',
        title: 'Assignment failed',
        description: e instanceof Error ? e.message : undefined,
      })
    },
  })

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'pickup' || key === 'total' ? 'desc' : 'asc')
    }
  }

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
  }

  if (error) {
    return (
      <Card title="Bookings">
        <p className="text-sm text-red-200">{error instanceof Error ? error.message : 'Error'}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
        <p className="text-xs text-white/50">
          Past pickups are removed from the database when this table loads (today and future trips only).
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="text-xs font-medium uppercase tracking-wide text-velox-muted">Pickup period</span>
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
            {sorted.length} of {bookings.length} bookings
          </span>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <label className="grid gap-1 text-xs text-velox-muted">
          Status
          <select
            className={selectClass}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BookingStatus | 'all')}
          >
            <option value="all">All</option>
            {ALL_BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-velox-muted">
          Vehicle
          <select className={selectClass} value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}>
            <option value="all">All</option>
            {vehicleOptions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-velox-muted">
          From
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
          To
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
            Refresh
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
              downloadBookingsCsv(sorted, `velox-bookings-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`)
              toast({
                variant: 'success',
                title: 'CSV downloaded',
                description: `${sorted.length} row(s) exported. Open in Excel or Google Sheets.`,
              })
            }}
          >
            Export CSV ({sorted.length})
          </Button>
        </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 shadow-xl shadow-black/40 backdrop-blur-xl">
        <table className="min-w-[960px] w-full border-collapse text-left text-sm">
          <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-velox-muted">
            <tr>
              <th className="px-3 py-3 font-medium">
                <SortHead label="Pickup" col="pickup" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              </th>
              <th className="px-3 py-3 font-medium">Route</th>
              <th className="px-3 py-3 font-medium">
                <SortHead label="Vehicle" col="vehicle" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              </th>
              <th className="px-3 py-3 font-medium">
                <SortHead label="Status" col="status" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              </th>
              <th className="px-3 py-3 font-medium">Driver</th>
              <th className="px-3 py-3 text-right font-medium">
                <SortHead label="Price" col="total" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-velox-muted">
                  No bookings match these filters.
                </td>
              </tr>
            ) : (
              sorted.map((b) => (
                <tr key={b.id} className="border-t border-white/10 hover:bg-white/5">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-white">
                    {formatDateTime(b.pickupDatetime)}
                  </td>
                  <td className="max-w-[220px] px-3 py-2 text-xs text-white/75">
                    <div className="line-clamp-2">{b.pickupAddress}</div>
                    <div className="mt-1 line-clamp-2 text-velox-muted">{b.dropoffAddress}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-white/85">
                    {b.routeTitle ?? (b.bookingType === 'custom' ? 'Custom' : '—')}
                  </td>
                  <td className="px-3 py-2">
                    {b.status === 'cancelled' ? (
                      <div className="space-y-1">
                        <span className="inline-block rounded-lg border border-red-400/35 bg-red-500/10 px-2 py-1 text-xs font-medium capitalize text-red-200">
                          cancelled
                        </span>
                        <p className="max-w-[12rem] text-[10px] leading-snug text-white/45">
                          Client or ops cancelled — cannot confirm or reassign.
                        </p>
                      </div>
                    ) : b.status === 'completed' ? (
                      <span className="inline-block rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs font-medium capitalize text-white/70">
                        completed
                      </span>
                    ) : (
                      <select
                        className={cn(selectClass, 'min-w-[10rem]')}
                        value={b.status}
                        disabled={updateStatus.isPending && updateStatus.variables?.id === b.id}
                        onChange={(e) => {
                          const status = e.target.value as BookingStatus
                          if (status === b.status) {
                            return
                          }
                          void updateStatus.mutateAsync({ id: b.id, status })
                        }}
                      >
                        {adminSelectableStatuses(b.status).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className={cn(selectClass, 'min-w-[11rem]')}
                      value={b.driverId ?? ''}
                      disabled={
                        b.status === 'cancelled' ||
                        b.status === 'completed' ||
                        (assignDriver.isPending && assignDriver.variables?.id === b.id)
                      }
                      onChange={(e) => {
                        const v = e.target.value
                        void assignDriver.mutateAsync({ id: b.id, driverId: v ? v : null })
                      }}
                    >
                      <option value="">Unassigned</option>
                      {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName}
                        {d.phone ? ` · ${d.phone}` : ''}
                      </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    <span className="font-medium text-velox-gold-light">
                      {(() => {
                        const charge = bookingChargeAmount(b)
                        return charge != null
                          ? formatCurrencyMajor(b.finalPrice ?? charge, b.currency)
                          : '—'
                      })()}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


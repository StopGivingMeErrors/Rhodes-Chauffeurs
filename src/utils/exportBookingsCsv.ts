import { format } from 'date-fns'
import type { BookingWithVehicle } from '@/types/booking'

/** Excel on Windows often expects semicolon-separated CSV in EU locales. */
export function detectCsvListSeparator(): ',' | ';' {
  if (typeof navigator === 'undefined') {
    return ','
  }
  const lang = navigator.language.toLowerCase()
  if (
    lang.startsWith('el') ||
    lang.startsWith('de') ||
    lang.startsWith('fr') ||
    lang.startsWith('es') ||
    lang.startsWith('it') ||
    lang.startsWith('pt') ||
    lang.startsWith('nl') ||
    lang.startsWith('pl')
  ) {
    return ';'
  }
  return ','
}

function escCell(value: string, separator: ',' | ';'): string {
  if (value.includes(separator) || /[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function cell(v: string | number | null | undefined, separator: ',' | ';'): string {
  if (v === null || v === undefined) {
    return escCell('', separator)
  }
  return escCell(String(v), separator)
}

/** ASCII-safe datetime for spreadsheets (no locale symbols). */
export function formatPickupForCsv(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return iso
  }
  return format(d, 'yyyy-MM-dd HH:mm')
}

export function buildBookingsCsv(
  rows: BookingWithVehicle[],
  options?: { separator?: ',' | ';' },
): string {
  const separator = options?.separator ?? detectCsvListSeparator()
  const headers = [
    'id',
    'client_id',
    'vehicle',
    'driver_id',
    'pickup_datetime',
    'pickup_address',
    'dropoff_address',
    'status',
    'passengers',
    'estimated_price',
    'final_price',
    'currency',
    'payment_method',
    'created_at',
  ]
  const dataLines = rows.map((r) =>
    [
      cell(r.id, separator),
      cell(r.clientId, separator),
      cell(r.vehicleName ?? '', separator),
      cell(r.driverId ?? '', separator),
      cell(formatPickupForCsv(r.pickupDatetime), separator),
      cell(r.pickupAddress, separator),
      cell(r.dropoffAddress, separator),
      cell(r.status, separator),
      cell(r.passengers, separator),
      cell(r.estimatedPrice ?? '', separator),
      cell(r.finalPrice ?? '', separator),
      cell(r.currency, separator),
      cell(r.paymentMethod, separator),
      cell(formatPickupForCsv(r.createdAt), separator),
    ].join(separator),
  )

  const lines = [headers.map((h) => escCell(h, separator)).join(separator), ...dataLines]
  return lines.join('\r\n')
}

export function downloadBookingsCsv(
  rows: BookingWithVehicle[],
  filename = 'bookings-export.csv',
  options?: { separator?: ',' | ';' },
) {
  const separator = options?.separator ?? detectCsvListSeparator()
  const csv = buildBookingsCsv(rows, { separator })
  // UTF-8 BOM + sep hint so Excel opens columns and encoding correctly.
  const payload = `\uFEFFsep=${separator}\r\n${csv}`
  const blob = new Blob([payload], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

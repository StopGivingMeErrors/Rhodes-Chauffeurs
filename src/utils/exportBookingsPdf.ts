import { format } from 'date-fns'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { bookingChargeAmount, type BookingWithVehicle } from '@/types/booking'
import { adminSimplifiedStatusLabel } from '@/utils/adminBookingStatus'
import { bookingRouteLabel } from '@/utils/adminBookingOps'
import { APP_NAME, APP_TAGLINE } from '@/utils/constants'
import { formatCurrencyMajor } from '@/utils/formatters'

export type BookingsPdfMeta = {
  filterLabel?: string
  generatedAt?: Date
}

function formatPickupForReport(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return iso
  }
  return format(d, 'dd MMM yyyy · HH:mm')
}

function tableBody(rows: BookingWithVehicle[]): string[][] {
  return rows.map((r) => {
    const charge = bookingChargeAmount(r)
    const price =
      charge != null ? formatCurrencyMajor(r.finalPrice ?? charge, r.currency) : '—'
    const clientLines = [r.clientEmail ?? '—', r.clientPhone?.trim() ? r.clientPhone : ''].filter(Boolean)
    return [
      clientLines.join('\n'),
      bookingRouteLabel(r),
      formatPickupForReport(r.pickupDatetime),
      String(r.passengers),
      adminSimplifiedStatusLabel(r.status),
      r.vehicleName ?? '—',
      r.driver?.fullName ?? '—',
      price,
    ]
  })
}

export function buildBookingsPdf(rows: BookingWithVehicle[], meta?: BookingsPdfMeta): jsPDF {
  const generatedAt = meta?.generatedAt ?? new Date()
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(30, 30, 30)
  doc.text(APP_NAME, 14, 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text(APP_TAGLINE, 14, 22)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(40, 40, 40)
  doc.text('Μητρώο κρατήσεων', 14, 30)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(70, 70, 70)
  const filterLine = meta?.filterLabel ? `Φίλτρο: ${meta.filterLabel}` : 'Φίλτρο: όλες οι ορατές διαδρομές'
  doc.text(filterLine, 14, 36)
  doc.text(`Δημιουργία: ${format(generatedAt, 'dd MMM yyyy · HH:mm')}`, 14, 41)
  doc.text(`Εγγραφές: ${rows.length}`, 14, 46)

  autoTable(doc, {
    startY: 52,
    head: [
      [
        'Πελάτης',
        'Διαδρομή',
        'Παραλαβή',
        'Επιβάτες',
        'Κατάσταση',
        'Όχημα',
        'Οδηγός',
        'Τιμή',
      ],
    ],
    body: tableBody(rows),
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      fillColor: [201, 168, 76],
      textColor: [20, 20, 20],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 246, 240] },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 52 },
      2: { cellWidth: 32 },
      3: { cellWidth: 14 },
      4: { cellWidth: 22 },
      5: { cellWidth: 28 },
      6: { cellWidth: 28 },
      7: { cellWidth: 22 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages()
      const page = data.pageNumber
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)
      doc.text(
        `${APP_NAME} — επίσημο αρχείο κρατήσεων. Για εσωτερική χρήση.`,
        14,
        doc.internal.pageSize.getHeight() - 8,
      )
      doc.text(`Page ${page} of ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, {
        align: 'right',
      })
    },
  })

  if (rows.length === 0) {
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text('Δεν υπάρχουν κρατήσεις σε αυτή την εξαγωγή.', 14, 60)
  }

  return doc
}

export function downloadBookingsPdf(
  rows: BookingWithVehicle[],
  filename = 'bookings-register.pdf',
  meta?: BookingsPdfMeta,
): void {
  const doc = buildBookingsPdf(rows, meta)
  const name = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  doc.save(name)
}

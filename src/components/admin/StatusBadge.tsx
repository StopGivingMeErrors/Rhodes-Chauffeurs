import type { BookingStatus } from '@/types/booking'
import { Badge } from '@/components/ui/Badge'

const statusLabel: Record<BookingStatus, string> = {
  pending: 'Pending payment',
  confirmed: 'Confirmed',
  assigned: 'Assigned',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

type StatusBadgeProps = {
  status: BookingStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge bookingStatus={status}>
      {statusLabel[status]}
    </Badge>
  )
}

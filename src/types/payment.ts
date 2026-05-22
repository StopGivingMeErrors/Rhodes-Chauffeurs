export type PaymentRowStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'

export type BookingPaymentStatus = PaymentRowStatus | 'none'

export type PaymentRow = {
  id: string
  bookingId: string
  stripePaymentIntentId: string
  stripeCustomerId: string | null
  amount: number
  currency: string
  status: PaymentRowStatus
  paidAt: string | null
  createdAt: string
}

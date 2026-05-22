import { describe, expect, it } from 'vitest'
import {
  adminSelectableStatuses,
  canAdminSetBookingStatus,
  isBookingMutableForAssignment,
} from '@/utils/bookingStatusTransitions'

describe('canAdminSetBookingStatus', () => {
  it('blocks reactivating a cancelled booking', () => {
    expect(canAdminSetBookingStatus('cancelled', 'confirmed')).toBe(false)
    expect(canAdminSetBookingStatus('cancelled', 'pending')).toBe(false)
    expect(canAdminSetBookingStatus('cancelled', 'assigned')).toBe(false)
  })

  it('allows staying cancelled', () => {
    expect(canAdminSetBookingStatus('cancelled', 'cancelled')).toBe(true)
  })

  it('allows confirming from pending', () => {
    expect(canAdminSetBookingStatus('pending', 'confirmed')).toBe(true)
  })

  it('allows cancelling from confirmed', () => {
    expect(canAdminSetBookingStatus('confirmed', 'cancelled')).toBe(true)
  })
})

describe('adminSelectableStatuses', () => {
  it('only offers cancelled when already cancelled', () => {
    expect(adminSelectableStatuses('cancelled')).toEqual(['cancelled'])
  })
})

describe('isBookingMutableForAssignment', () => {
  it('rejects cancelled and completed', () => {
    expect(isBookingMutableForAssignment('cancelled')).toBe(false)
    expect(isBookingMutableForAssignment('completed')).toBe(false)
    expect(isBookingMutableForAssignment('pending')).toBe(true)
  })
})

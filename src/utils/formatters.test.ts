import { describe, expect, it } from 'vitest'
import { formatCurrencyMajor, formatCurrencyMinor, formatDurationMinutes } from '@/utils/formatters'

describe('formatCurrencyMajor', () => {
  it('formats EUR amounts', () => {
    const s = formatCurrencyMajor(120.5, 'eur')
    expect(s).toMatch(/120/)
    expect(s).toMatch(/€|EUR/i)
  })
})

describe('formatCurrencyMinor', () => {
  it('converts cents to major display', () => {
    const s = formatCurrencyMinor(12050, 'EUR')
    expect(s).toMatch(/120/)
  })
})

describe('formatDurationMinutes', () => {
  it('formats hours and minutes', () => {
    expect(formatDurationMinutes(125)).toBe('2h 5m')
  })

  it('formats minutes only', () => {
    expect(formatDurationMinutes(45)).toBe('45m')
  })
})

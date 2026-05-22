import { describe, expect, it } from 'vitest'
import { withTimeout } from '@/utils/async'

describe('withTimeout', () => {
  it('resolves when promise finishes in time', async () => {
    await expect(withTimeout(Promise.resolve(42), 1000, 'timeout')).resolves.toBe(42)
  })

  it('rejects when promise is too slow', async () => {
    await expect(
      withTimeout(new Promise((resolve) => setTimeout(() => resolve(1), 50)), 5, 'too slow'),
    ).rejects.toThrow('too slow')
  })
})

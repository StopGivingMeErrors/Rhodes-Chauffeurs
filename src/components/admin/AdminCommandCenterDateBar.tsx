import { format } from 'date-fns'
import { useEffect, useState } from 'react'

/**
 * Apple-style date strip for the admin command center (under the global navbar).
 */
export function AdminCommandCenterDateBar() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const weekday = format(now, 'EEEE')
  const monthDay = format(now, 'MMMM d')
  const year = format(now, 'yyyy')

  return (
    <div
      className="border-b border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent"
      aria-label={`Today is ${weekday}, ${monthDay}, ${year}`}
    >
      <div className="mx-auto flex w-full max-w-[1600px] items-end justify-between gap-4 px-4 py-4 lg:px-10 lg:py-5">
        <div
          className="min-w-0"
          style={{
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif",
          }}
        >
          <p className="text-[13px] font-medium tracking-[0.02em] text-white/55 sm:text-sm">{weekday}</p>
          <p className="mt-0.5 text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-none tracking-tight text-white">
            {monthDay}
          </p>
        </div>
        <p
          className="shrink-0 pb-1 text-right text-sm font-medium tabular-nums tracking-wide text-white/40"
          style={{
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif",
          }}
        >
          {year}
        </p>
      </div>
    </div>
  )
}

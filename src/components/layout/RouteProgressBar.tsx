import { useEffect, useRef } from 'react'
import { useNavigation } from 'react-router-dom'

/** Thin top progress bar during route transitions (NProgress-style). */
export function RouteProgressBar() {
  const navigation = useNavigation()
  const busy = navigation.state !== 'idle'
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = barRef.current
    if (!el) {
      return
    }
    if (busy) {
      el.style.opacity = '1'
      el.style.width = '36%'
    } else {
      el.style.width = '100%'
      const done = window.setTimeout(() => {
        el.style.opacity = '0'
        el.style.width = '0%'
      }, 200)
      return () => window.clearTimeout(done)
    }
  }, [busy])

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[300] h-[3px] overflow-hidden bg-white/5"
      aria-hidden
    >
      <div
        ref={barRef}
        className="h-full w-0 bg-gradient-to-r from-velox-gold via-velox-gold-light to-velox-gold opacity-0 transition-[width,opacity] duration-300 ease-out"
      />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/utils/constants'

const STORAGE_KEY = 'velox_cookie_consent_v1'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true)
      }
    } catch {
      setVisible(true)
    }
  }, [])

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted')
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  if (!visible) {
    return null
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-velox-void/95 px-4 py-4 backdrop-blur-md sm:px-8"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-velox-muted sm:max-w-2xl">
          We use essential cookies and local storage to keep you signed in and remember your booking preferences. See our{' '}
          <Link to={ROUTES.privacy} className="text-velox-gold-light underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <Button type="button" size="sm" onClick={accept} className="shrink-0">
          Accept
        </Button>
      </div>
    </div>
  )
}

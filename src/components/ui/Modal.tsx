import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

type ModalProps = {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Classes for the scrollable body under the header. */
  bodyClassName?: string
}

export function Modal({ open, title, description, onClose, children, footer, bodyClassName }: ModalProps) {
  useEffect(() => {
    if (!open) {
      return
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0f]/75 px-4 py-10 backdrop-blur-md"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className={cn(
          'relative w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_0_60px_rgba(0,0,0,0.6),0_0_1px_rgba(255,255,255,0.08)_inset] backdrop-blur-xl',
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="velox-modal-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="velox-modal-title" className="font-display text-xl text-white">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-velox-muted">{description}</p> : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 rounded-full px-0 text-white/60 hover:text-white"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className={cn('mt-5', bodyClassName)}>{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}

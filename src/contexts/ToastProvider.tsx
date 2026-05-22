import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Toast } from '@/components/ui/Toast'
import { ToastContext, type ToastInput, type ToastItem } from '@/contexts/toastContext'
import { cn } from '@/utils/cn'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (input: ToastInput) => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const item: ToastItem = {
        id,
        title: input.title,
        description: input.description,
        variant: input.variant ?? 'info',
        duration: input.duration ?? 4800,
      }
      setToasts((prev) => [...prev, item])
      const ms = item.duration ?? 4800
      if (ms > 0) {
        window.setTimeout(() => {
          dismiss(id)
        }, ms)
      }
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className={cn(
          'pointer-events-none fixed bottom-4 right-4 z-[200] flex max-w-[min(22rem,calc(100vw-2rem))] flex-col gap-2',
          'sm:bottom-6 sm:right-6',
        )}
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast item={t} onDismiss={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

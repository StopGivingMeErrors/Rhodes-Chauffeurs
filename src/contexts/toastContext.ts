import { createContext } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

export type ToastInput = {
  title: string
  description?: string
  variant?: ToastVariant
  /** Auto-dismiss ms (default 4800). */
  duration?: number
}

export type ToastItem = ToastInput & {
  id: string
  variant: ToastVariant
}

export type ToastContextValue = {
  toast: (input: ToastInput) => void
  dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

import { useEffect } from 'react'
import { APP_NAME } from '@/utils/constants'

export type PageMetaInput = {
  title: string
  description?: string
}

const DEFAULT_DESCRIPTION =
  'Velox VIP — luxury private chauffeur transportation. Book sedans, SUVs, vans, and sprinters with transparent pricing.'

/**
 * Sets document title and meta description for the current view (client-side SPA).
 */
export function usePageMeta({ title, description }: PageMetaInput) {
  useEffect(() => {
    const previousTitle = document.title
    const meta =
      document.querySelector<HTMLMetaElement>('meta[name="description"]') ??
      (() => {
        const m = document.createElement('meta')
        m.setAttribute('name', 'description')
        document.head.appendChild(m)
        return m
      })()
    const previousDescription = meta.getAttribute('content') ?? ''

    document.title = `${title} · ${APP_NAME}`
    meta.setAttribute('content', description ?? DEFAULT_DESCRIPTION)

    return () => {
      document.title = previousTitle
      meta.setAttribute('content', previousDescription || DEFAULT_DESCRIPTION)
    }
  }, [title, description])
}

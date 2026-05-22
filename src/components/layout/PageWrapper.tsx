import type { ReactNode } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Sidebar } from '@/components/layout/Sidebar'
import { cn } from '@/utils/cn'

type PageWrapperProps = {
  title?: string
  subtitle?: string
  children: ReactNode
  className?: string
  /** Marketing home: no sidebar, full-width main for edge-to-edge sections */
  /** Client dashboard: no global sidebar; page supplies its own glass sidebar */
  variant?: 'default' | 'landing' | 'dashboard'
}

export function PageWrapper({ title, subtitle, children, className, variant = 'default' }: PageWrapperProps) {
  const isLanding = variant === 'landing'
  const isDashboard = variant === 'dashboard'

  return (
    <div className="flex min-h-dvh flex-col bg-velox-void">
      <Navbar />
      <div className="flex flex-1">
        {!isLanding && !isDashboard ? <Sidebar /> : null}
        <main
          className={cn(
            'mx-auto flex w-full flex-1 flex-col',
            isLanding ? 'max-w-none' : isDashboard ? 'max-w-none px-0 py-0' : 'max-w-6xl px-4 py-8',
            !isLanding && !isDashboard && className,
            isDashboard && className,
          )}
        >
          {!isLanding && !isDashboard && (title || subtitle) ? (
            <header className="mb-8 max-w-3xl px-4 lg:px-0">
              {title ? (
                <h1 className="font-display text-3xl text-white sm:text-4xl">{title}</h1>
              ) : null}
              {subtitle ? <p className="mt-2 text-sm text-velox-muted sm:text-base">{subtitle}</p> : null}
            </header>
          ) : null}
          {isLanding ? <div className={cn('flex flex-1 flex-col', className)}>{children}</div> : children}
        </main>
      </div>
    </div>
  )
}

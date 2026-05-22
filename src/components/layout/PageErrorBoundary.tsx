import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

type PageErrorBoundaryProps = {
  children: ReactNode
}

type PageErrorBoundaryState = {
  error: Error | null
  resetKey: number
}

export class PageErrorBoundary extends Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  state: PageErrorBoundaryState = { error: null, resetKey: 0 }

  static getDerivedStateFromError(error: Error): Partial<PageErrorBoundaryState> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PageErrorBoundary]', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState((s) => ({ error: null, resetKey: s.resetKey + 1 }))
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-velox-void px-4 py-16">
          <Card className="max-w-md border-white/15 bg-zinc-950/60 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-velox-gold-light">Something went wrong</p>
            <h1 className="mt-2 font-display text-2xl text-white">This view hit an error</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              {this.state.error.message || 'An unexpected error occurred. You can try loading the page again.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button type="button" variant="primary" onClick={this.handleRetry} aria-label="Try loading this page again">
                Try again
              </Button>
              <Button type="button" variant="secondary" onClick={() => window.location.assign('/')} aria-label="Go to home page">
                Go home
              </Button>
            </div>
          </Card>
        </div>
      )
    }

    return <div key={this.state.resetKey}>{this.props.children}</div>
  }
}

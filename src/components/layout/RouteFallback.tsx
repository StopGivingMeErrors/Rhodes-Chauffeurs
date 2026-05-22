import { Spinner } from '@/components/ui/Spinner'

export function RouteFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-velox-void">
      <Spinner label="Loading" />
    </div>
  )
}

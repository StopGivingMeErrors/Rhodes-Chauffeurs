import { cn } from '@/utils/cn'

type SpinnerProps = {
  label?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const ringSize: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-6 w-6 border-2',
  md: 'h-10 w-10 border-[3px]',
  lg: 'h-14 w-14 border-[3px]',
}

export function Spinner({ label = 'Loading', className, size = 'md' }: SpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-10', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-velox-gold/15 border-t-velox-gold border-r-velox-gold/40 shadow-[0_0_24px_rgba(201,168,76,0.2)]',
          ringSize[size],
        )}
        role="status"
        aria-label={label}
      />
      <p className="text-sm text-velox-muted">{label}</p>
    </div>
  )
}

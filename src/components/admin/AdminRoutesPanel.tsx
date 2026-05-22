import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/hooks/useToast'
import { createRouteAdmin, listAllRoutesAdmin, updateRouteAdmin } from '@/services/routeService'
import type { RoutePricingUnit, TransportRoute } from '@/types/route'
import { formatCurrencyMajor } from '@/utils/formatters'
import { formatRouteTierSummary } from '@/utils/routePricing'

const selectClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-velox-gold/50 focus:bg-white/[0.07] focus:ring-1 focus:ring-velox-gold/25'

function parsePrice(value: string): number | null {
  const n = Number.parseFloat(value.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) {
    return null
  }
  return Math.round(n * 100) / 100
}

function PricingUnitField({
  value,
  onChange,
  disabled,
}: {
  value: RoutePricingUnit
  onChange: (unit: RoutePricingUnit) => void
  disabled?: boolean
}) {
  return (
    <label className="block space-y-1.5 text-left">
      <span className="text-xs font-medium uppercase tracking-wide text-velox-muted">Pricing type</span>
      <select
        className={selectClass}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as RoutePricingUnit)}
      >
        <option value="trip" className="bg-velox-midnight">
          Fixed trip price
        </option>
        <option value="hour" className="bg-velox-midnight">
          Per hour (e.g. island tour)
        </option>
      </select>
    </label>
  )
}

export function AdminRoutesPanel() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { data: routes = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'routes'],
    queryFn: listAllRoutesAdmin,
  })
  const [title, setTitle] = useState('')
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [price1to4, setPrice1to4] = useState('')
  const [price5to8, setPrice5to8] = useState('')
  const [pricingUnit, setPricingUnit] = useState<RoutePricingUnit>('trip')
  const [subtitle, setSubtitle] = useState('')

  const createMutation = useMutation({
    mutationFn: () => {
      const p14 = parsePrice(price1to4)
      const p58 = parsePrice(price5to8)
      if (p14 == null || p58 == null) {
        throw new Error('Enter valid prices (0 or greater) for both guest tiers.')
      }
      if (!title.trim() || !pickup.trim() || !dropoff.trim()) {
        throw new Error('Title, pickup, and destination are required.')
      }
      return createRouteAdmin({
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        pickupAddress: pickup.trim(),
        dropoffAddress: dropoff.trim(),
        price1to4: p14,
        price5to8: p58,
        pricingUnit,
        active: true,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'routes'] })
      void qc.invalidateQueries({ queryKey: ['routes', 'active'] })
      setTitle('')
      setPickup('')
      setDropoff('')
      setPrice1to4('')
      setPrice5to8('')
      setPricingUnit('trip')
      setSubtitle('')
      toast({ variant: 'success', title: 'Route created' })
    },
    onError: (e) => {
      toast({ variant: 'error', title: 'Could not create route', description: e instanceof Error ? e.message : '' })
    },
  })

  if (isLoading) return <Spinner label="Loading routes" />
  if (error) {
    return (
      <Card title="Routes">
        <p className="text-sm text-red-200">{error instanceof Error ? error.message : 'Failed to load routes.'}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-velox-muted">
        Custom routes (any address) are cash to the driver only — not priced here. Fixed routes use{' '}
        <span className="text-white/80">1–4</span> and <span className="text-white/80">5–8</span> guest tiers (same as
        the booking wizard). All fixed routes use Lindos as the starting base unless you override the subtitle.
      </p>

      <Card
        title="Add fixed route"
        description="Set both passenger tiers — customers pay based on how many guests they select at booking."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <PricingUnitField value={pricingUnit} onChange={setPricingUnit} />
          <Input
            label="Price 1–4 guests (EUR)"
            type="number"
            min={0}
            step="0.01"
            value={price1to4}
            onChange={(e) => setPrice1to4(e.target.value)}
          />
          <Input
            label="Price 5–8 guests (EUR)"
            type="number"
            min={0}
            step="0.01"
            value={price5to8}
            onChange={(e) => setPrice5to8(e.target.value)}
          />
          <Input label="Pickup" className="sm:col-span-2" value={pickup} onChange={(e) => setPickup(e.target.value)} />
          <Input
            label="Destination"
            className="sm:col-span-2"
            value={dropoff}
            onChange={(e) => setDropoff(e.target.value)}
          />
          <Input
            label="Subtitle (optional)"
            className="sm:col-span-2"
            placeholder="Leave blank to auto-generate from prices + Lindos base"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
        </div>
        <Button
          type="button"
          className="mt-4"
          disabled={createMutation.isPending}
          isLoading={createMutation.isPending}
          onClick={() => void createMutation.mutate()}
        >
          Create route
        </Button>
      </Card>

      <Card title="Fixed routes" description="Edit tier prices or deactivate. Changes apply at checkout immediately.">
        <ul className="space-y-4">
          {routes.length === 0 ? (
            <p className="text-sm text-velox-muted">No routes yet. Add one above.</p>
          ) : null}
          {routes.map((route) => (
            <RouteRow key={route.id} route={route} />
          ))}
        </ul>
      </Card>
    </div>
  )
}

function RouteRow({ route }: { route: TransportRoute }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [price1to4, setPrice1to4] = useState(String(route.price1to4))
  const [price5to8, setPrice5to8] = useState(String(route.price5to8))
  const [pricingUnit, setPricingUnit] = useState<RoutePricingUnit>(route.pricingUnit)
  const [active, setActive] = useState(route.active)

  const saveMutation = useMutation({
    mutationFn: () => {
      const p14 = parsePrice(price1to4)
      const p58 = parsePrice(price5to8)
      if (p14 == null || p58 == null) {
        throw new Error('Enter valid prices for both guest tiers.')
      }
      return updateRouteAdmin(route.id, {
        price1to4: p14,
        price5to8: p58,
        pricingUnit,
        active,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'routes'] })
      void qc.invalidateQueries({ queryKey: ['routes', 'active'] })
      toast({ variant: 'success', title: 'Route updated' })
    },
    onError: (e) => {
      toast({
        variant: 'error',
        title: 'Could not update route',
        description: e instanceof Error ? e.message : '',
      })
    },
  })

  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="font-medium text-white">{route.title}</p>
      <p className="mt-1 text-xs text-white/50">
        {route.pickupAddress} → {route.dropoffAddress}
      </p>
      {route.subtitle ? <p className="mt-1 text-xs text-white/40">{route.subtitle}</p> : null}
      <p className="mt-2 text-sm text-velox-gold-light">{formatRouteTierSummary(route)}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Input
          label="Price 1–4 guests (EUR)"
          type="number"
          min={0}
          step="0.01"
          value={price1to4}
          onChange={(e) => setPrice1to4(e.target.value)}
        />
        <Input
          label="Price 5–8 guests (EUR)"
          type="number"
          min={0}
          step="0.01"
          value={price5to8}
          onChange={(e) => setPrice5to8(e.target.value)}
        />
        <PricingUnitField
          value={pricingUnit}
          onChange={setPricingUnit}
          disabled={saveMutation.isPending}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="accent-velox-gold"
          />
          Active on booking page
        </label>
        <Button type="button" size="sm" isLoading={saveMutation.isPending} onClick={() => void saveMutation.mutate()}>
          Save
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-velox-muted">
        Checkout uses {formatCurrencyMajor(route.price1to4, 'EUR')}
        {route.pricingUnit === 'hour' ? '/hr' : ''} (1–4) or{' '}
        {formatCurrencyMajor(route.price5to8, 'EUR')}
        {route.pricingUnit === 'hour' ? '/hr' : ''} (5–8).
      </p>
    </li>
  )
}

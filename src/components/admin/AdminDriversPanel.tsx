import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AdminTable, type AdminColumn } from '@/components/admin/AdminTable'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useAdminDriversList } from '@/hooks/useAdminDashboard'
import { useToast } from '@/hooks/useToast'
import { createCompanyDriver, deleteCompanyDriver, updateCompanyDriver } from '@/services/driverService'
import type { CompanyDriver } from '@/types/driver'
import { QUERY_KEYS } from '@/utils/constants'
import { cn } from '@/utils/cn'

const cellInputClass =
  'w-full min-w-[8rem] rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white outline-none focus:border-velox-gold/40'

export function AdminDriversPanel() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { data: drivers = [], isLoading, error, refetch, isFetching } = useAdminDriversList()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.adminDrivers })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.adminBookings })
  }

  const createMut = useMutation({
    mutationFn: () =>
      createCompanyDriver({
        fullName: fullName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
      }),
    onSuccess: () => {
      setFullName('')
      setEmail('')
      setPhone('')
      invalidate()
      toast({ variant: 'success', title: 'Driver added' })
    },
    onError: (e) => {
      toast({
        variant: 'error',
        title: 'Could not add driver',
        description: e instanceof Error ? e.message : undefined,
      })
    },
  })

  const updateMut = useMutation({
    mutationFn: (id: string) =>
      updateCompanyDriver(id, {
        fullName: editName.trim(),
        email: editEmail.trim() || null,
        phone: editPhone.trim() || null,
      }),
    onSuccess: () => {
      setEditingId(null)
      invalidate()
      toast({ variant: 'success', title: 'Driver updated' })
    },
    onError: (e) => {
      toast({
        variant: 'error',
        title: 'Could not update driver',
        description: e instanceof Error ? e.message : undefined,
      })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCompanyDriver(id),
    onSuccess: () => {
      invalidate()
      toast({ variant: 'success', title: 'Driver removed' })
    },
    onError: (e) => {
      toast({
        variant: 'error',
        title: 'Could not remove driver',
        description: e instanceof Error ? e.message : undefined,
      })
    },
  })

  function startEdit(d: CompanyDriver) {
    setEditingId(d.id)
    setEditName(d.fullName)
    setEditEmail(d.email ?? '')
    setEditPhone(d.phone ?? '')
  }

  const columns: AdminColumn<CompanyDriver>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: (d) =>
        editingId === d.id ? (
          <input className={cellInputClass} value={editName} onChange={(e) => setEditName(e.target.value)} aria-label="Name" />
        ) : (
          <span className="font-medium text-white">{d.fullName}</span>
        ),
    },
    {
      id: 'email',
      header: 'Email',
      cell: (d) =>
        editingId === d.id ? (
          <input
            className={cellInputClass}
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            aria-label="Email"
          />
        ) : (
          <span className="text-white/80">{d.email ?? '—'}</span>
        ),
    },
    {
      id: 'phone',
      header: 'Phone',
      cell: (d) =>
        editingId === d.id ? (
          <input className={cellInputClass} type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} aria-label="Phone" />
        ) : (
          <span className="text-white/80">{d.phone ?? '—'}</span>
        ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-[1%] whitespace-nowrap text-right',
      cell: (d) =>
        editingId === d.id ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" variant="secondary" disabled={updateMut.isPending} onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={updateMut.isPending || !editName.trim()}
              isLoading={updateMut.isPending}
              onClick={() => void updateMut.mutateAsync(d.id)}
            >
              Save
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => startEdit(d)}>
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn('text-red-300 hover:text-red-200')}
              disabled={deleteMut.isPending}
              onClick={() => {
                if (window.confirm(`Remove ${d.fullName} from the roster?`)) {
                  void deleteMut.mutateAsync(d.id)
                }
              }}
            >
              Delete
            </Button>
          </div>
        ),
    },
  ]

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Spinner label="Loading drivers" />
      </div>
    )
  }

  if (error) {
    return (
      <Card title="Drivers">
        <p className="text-sm text-red-200">{error instanceof Error ? error.message : 'Error'}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card title="Add driver" description="Internal roster only — no app login. Used when assigning bookings.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </div>
        <Button
          type="button"
          className="mt-4"
          disabled={!fullName.trim() || createMut.isPending}
          isLoading={createMut.isPending}
          onClick={() => void createMut.mutateAsync()}
        >
          Add to roster
        </Button>
      </Card>

      <div className="flex justify-end">
        <Button type="button" variant="secondary" isLoading={isFetching} onClick={() => void refetch()}>
          Refresh list
        </Button>
      </div>

      <AdminTable<CompanyDriver>
        data={drivers}
        getRowId={(d) => d.id}
        emptyMessage="No drivers yet. Add people above — they also appear in the bookings assignment dropdown."
        columns={columns}
      />
    </div>
  )
}

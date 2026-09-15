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
  'w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white outline-none focus:border-velox-gold/40'

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
      toast({ variant: 'success', title: 'Προστέθηκε οδηγός' })
    },
    onError: (e) => {
      toast({
        variant: 'error',
        title: 'Δεν προστέθηκε οδηγός',
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
      toast({ variant: 'success', title: 'Ενημερώθηκε οδηγός' })
    },
    onError: (e) => {
      toast({
        variant: 'error',
        title: 'Δεν ενημερώθηκε οδηγός',
        description: e instanceof Error ? e.message : undefined,
      })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCompanyDriver(id),
    onSuccess: () => {
      invalidate()
      toast({ variant: 'success', title: 'Αφαιρέθηκε οδηγός' })
    },
    onError: (e) => {
      toast({
        variant: 'error',
        title: 'Δεν αφαιρέθηκε οδηγός',
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

  function renderActions(d: CompanyDriver) {
    if (editingId === d.id) {
      return (
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button type="button" size="sm" variant="secondary" disabled={updateMut.isPending} onClick={() => setEditingId(null)}>
            Ακύρωση
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={updateMut.isPending || !editName.trim()}
            isLoading={updateMut.isPending}
            onClick={() => void updateMut.mutateAsync(d.id)}
          >
            Αποθήκευση
          </Button>
        </div>
      )
    }
    return (
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Button type="button" size="sm" variant="secondary" onClick={() => startEdit(d)}>
          Επεξεργασία
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn('text-red-300 hover:text-red-200')}
          disabled={deleteMut.isPending}
          onClick={() => {
            if (window.confirm(`Αφαίρεση του ${d.fullName} από το roster;`)) {
              void deleteMut.mutateAsync(d.id)
            }
          }}
        >
          Διαγραφή
        </Button>
      </div>
    )
  }

  function renderDriverFields(d: CompanyDriver) {
    const editing = editingId === d.id
    return (
      <div className="grid gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-velox-muted">Όνομα</p>
          {editing ? (
            <input
              className={cn(cellInputClass, 'mt-1')}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              aria-label="Όνομα"
            />
          ) : (
            <p className="mt-1 font-medium text-white">{d.fullName}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-velox-muted">Email</p>
          {editing ? (
            <input
              className={cn(cellInputClass, 'mt-1')}
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              aria-label="Email"
            />
          ) : (
            <p className="mt-1 break-all text-white/80">{d.email ?? '—'}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-velox-muted">Τηλέφωνο</p>
          {editing ? (
            <input
              className={cn(cellInputClass, 'mt-1')}
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              aria-label="Τηλέφωνο"
            />
          ) : (
            <p className="mt-1 text-white/80">{d.phone ?? '—'}</p>
          )}
        </div>
      </div>
    )
  }

  const columns: AdminColumn<CompanyDriver>[] = [
    {
      id: 'name',
      header: 'Όνομα',
      cell: (d) =>
        editingId === d.id ? (
          <input className={cn(cellInputClass, 'min-w-[8rem]')} value={editName} onChange={(e) => setEditName(e.target.value)} aria-label="Όνομα" />
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
            className={cn(cellInputClass, 'min-w-[8rem]')}
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
      header: 'Τηλέφωνο',
      cell: (d) =>
        editingId === d.id ? (
          <input
            className={cn(cellInputClass, 'min-w-[8rem]')}
            type="tel"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            aria-label="Τηλέφωνο"
          />
        ) : (
          <span className="text-white/80">{d.phone ?? '—'}</span>
        ),
    },
    {
      id: 'actions',
      header: 'Ενέργειες',
      className: 'w-[1%] whitespace-nowrap text-right',
      cell: (d) => renderActions(d),
    },
  ]

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Spinner label="Φόρτωση οδηγών" />
      </div>
    )
  }

  if (error) {
    return (
      <Card title="Οδηγοί">
        <p className="text-sm text-red-200">{error instanceof Error ? error.message : 'Σφάλμα'}</p>
      </Card>
    )
  }

  const emptyMessage = 'Δεν υπάρχουν οδηγοί. Προσθέστε από πάνω — εμφανίζονται και στο dropdown κρατήσεων.'

  return (
    <div className="space-y-6">
      <Card title="Προσθήκη οδηγού" description="Εσωτερικό roster μόνο — χωρίς σύνδεση στην εφαρμογή. Χρησιμοποιείται στις κρατήσεις.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Ονοματεπώνυμο" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <Input label="Τηλέφωνο" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </div>
        <Button
          type="button"
          className="mt-4 w-full sm:w-auto"
          disabled={!fullName.trim() || createMut.isPending}
          isLoading={createMut.isPending}
          onClick={() => void createMut.mutateAsync()}
        >
          Προσθήκη στο roster
        </Button>
      </Card>

      <div className="flex justify-end">
        <Button type="button" variant="secondary" isLoading={isFetching} onClick={() => void refetch()}>
          Ανανέωση λίστας
        </Button>
      </div>

      {/* Phone / tablet: stacked cards */}
      <div className="space-y-3 lg:hidden">
        {drivers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-10 text-center text-sm text-velox-muted">
            {emptyMessage}
          </div>
        ) : (
          drivers.map((d) => (
            <article
              key={d.id}
              className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-lg shadow-black/30"
            >
              {renderDriverFields(d)}
              <div className="border-t border-white/10 pt-3">{renderActions(d)}</div>
            </article>
          ))
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden lg:block">
        <AdminTable<CompanyDriver>
          data={drivers}
          getRowId={(d) => d.id}
          emptyMessage={emptyMessage}
          columns={columns}
        />
      </div>
    </div>
  )
}

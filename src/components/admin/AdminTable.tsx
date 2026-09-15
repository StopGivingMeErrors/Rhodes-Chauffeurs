import type { ReactNode } from 'react'

export type AdminColumn<T> = {
  id: string
  header: string
  cell: (row: T) => ReactNode
  className?: string
}

type AdminTableProps<T> = {
  data: T[]
  columns: AdminColumn<T>[]
  getRowId: (row: T) => string
  emptyMessage?: string
}

export function AdminTable<T>({ data, columns, getRowId, emptyMessage }: AdminTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-10 text-center text-sm text-velox-muted">
        {emptyMessage ?? 'Nothing to show yet.'}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 shadow-xl shadow-black/40 backdrop-blur-xl">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wide text-velox-muted">
          <tr>
            {columns.map((col) => (
              <th key={col.id} className={`px-4 py-3 font-medium ${col.className ?? ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={getRowId(row)} className="border-t border-white/10 hover:bg-white/5">
              {columns.map((col) => (
                <td key={col.id} className={`px-4 py-3 align-middle text-white/90 ${col.className ?? ''}`}>
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

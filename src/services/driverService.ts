import { assertSupabaseConfigured, supabase } from '@/services/supabase'
import type { CompanyDriver } from '@/types/driver'

type CompanyDriverRow = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  created_at: string
}

function mapRow(row: CompanyDriverRow): CompanyDriver {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    createdAt: row.created_at,
  }
}

export async function listCompanyDrivers(): Promise<CompanyDriver[]> {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('company_drivers')
    .select('*')
    .order('full_name', { ascending: true })

  if (error) {
    throw error
  }

  return (data as CompanyDriverRow[]).map(mapRow)
}

export async function createCompanyDriver(input: {
  fullName: string
  email: string | null
  phone: string | null
}): Promise<CompanyDriver> {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('company_drivers')
    .insert({
      full_name: input.fullName.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapRow(data as CompanyDriverRow)
}

export async function updateCompanyDriver(
  id: string,
  input: { fullName: string; email: string | null; phone: string | null },
): Promise<CompanyDriver> {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('company_drivers')
    .update({
      full_name: input.fullName.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapRow(data as CompanyDriverRow)
}

export async function deleteCompanyDriver(id: string): Promise<void> {
  assertSupabaseConfigured()
  const { error } = await supabase.from('company_drivers').delete().eq('id', id)

  if (error) {
    throw error
  }
}

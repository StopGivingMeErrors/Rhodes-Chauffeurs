/** Company roster entry; not an auth user. */
export type CompanyDriver = {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  createdAt: string
}

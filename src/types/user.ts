export type UserRole = 'client' | 'admin' | 'driver'

export type UserProfile = {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  role: UserRole
  avatarUrl: string | null
  createdAt: string
}

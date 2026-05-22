import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { updateAuthPassword } from '@/services/authService'
import {
  changePasswordSchema,
  profileEditSchema,
  type ChangePasswordFormValues,
  type ProfileEditFormValues,
} from '@/utils/validators'

export function ProfilePanel() {
  const { user, profile, updateClientProfile } = useAuth()

  const profileForm = useForm<ProfileEditFormValues>({
    resolver: zodResolver(profileEditSchema),
    values: {
      fullName: profile?.fullName ?? '',
      phone: profile?.phone ?? '',
    },
  })

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  async function onSaveProfile(values: ProfileEditFormValues) {
    if (!user?.id) {
      return
    }
    profileForm.clearErrors('root')
    try {
      await updateClientProfile({
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
      })
    } catch (err) {
      profileForm.setError('root', {
        message: err instanceof Error ? err.message : 'Could not save profile.',
      })
    }
  }

  async function onChangePassword(values: ChangePasswordFormValues) {
    passwordForm.clearErrors('root')
    try {
      await updateAuthPassword(values.newPassword)
      passwordForm.reset({ newPassword: '', confirmPassword: '' })
    } catch (err) {
      passwordForm.setError('root', {
        message: err instanceof Error ? err.message : 'Could not update password.',
      })
    }
  }

  return (
    <div key={user?.id ?? 'signed-out'} className="mx-auto max-w-xl space-y-8">
      <Card hoverGlow title="Profile" description="Update how we address you and reach you on the day of travel.">
        <form className="space-y-4" onSubmit={profileForm.handleSubmit(onSaveProfile)} noValidate>
          {profileForm.formState.errors.root?.message ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {profileForm.formState.errors.root.message}
            </p>
          ) : null}
          <Input
            label="Full name"
            autoComplete="name"
            error={profileForm.formState.errors.fullName?.message}
            {...profileForm.register('fullName')}
          />
          <Input
            label="Phone"
            type="tel"
            autoComplete="tel"
            error={profileForm.formState.errors.phone?.message}
            {...profileForm.register('phone')}
          />
          <p className="text-xs text-velox-muted">Email is tied to your login: {user?.email}</p>
          <Button type="submit" isLoading={profileForm.formState.isSubmitting}>
            Save profile
          </Button>
        </form>
      </Card>

      <Card hoverGlow title="Change password" description="Use a strong password you do not reuse elsewhere.">
        <form className="space-y-4" onSubmit={passwordForm.handleSubmit(onChangePassword)} noValidate>
          {passwordForm.formState.errors.root?.message ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {passwordForm.formState.errors.root.message}
            </p>
          ) : null}
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            error={passwordForm.formState.errors.newPassword?.message}
            {...passwordForm.register('newPassword')}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={passwordForm.formState.errors.confirmPassword?.message}
            {...passwordForm.register('confirmPassword')}
          />
          <Button type="submit" variant="secondary" isLoading={passwordForm.formState.isSubmitting}>
            Update password
          </Button>
        </form>
      </Card>
    </div>
  )
}

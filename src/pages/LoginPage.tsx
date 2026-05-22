import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/useAuth'
import { usePageMeta } from '@/hooks/usePageMeta'
import { formatAuthError } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'
import type { UserProfile } from '@/types/user'
import { ROUTES } from '@/utils/constants'
import { cn } from '@/utils/cn'
import { loginSchema, signupSchema, type LoginFormValues, type SignupFormValues } from '@/utils/validators'

type AuthTab = 'signin' | 'signup'

function resolvePostAuthPath(fromPath: string | undefined, p: UserProfile | null) {
  if (fromPath) {
    return fromPath
  }
  if (p?.role === 'admin') {
    return ROUTES.admin
  }
  if (p?.role === 'client') {
    return ROUTES.dashboard
  }
  return ROUTES.home
}

export function LoginPage() {
  usePageMeta({
    title: 'Client login',
    description: 'Sign in or create a Velox VIP account to manage reservations and complete payment.',
  })
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { signIn, signUp, isAuthenticated, isLoading, profile } = useAuth()
  const [tab, setTab] = useState<AuthTab>('signin')
  const [signInError, setSignInError] = useState<string | null>(null)
  const [signUpError, setSignUpError] = useState<string | null>(null)
  const authSubmitLock = useRef(false)

  const stateFrom = (location.state as { from?: string } | null)?.from
  const nextFromQuery = searchParams.get('next')?.trim() || undefined
  const returnPath = nextFromQuery ?? stateFrom
  const defaultAfterAuth = resolvePostAuthPath(returnPath, profile)
  const redirectingToBook = returnPath === ROUTES.book

  useEffect(() => {
    if (redirectingToBook) {
      setTab('signup')
    }
  }, [redirectingToBook])

  const signInForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const signUpForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  if (!isLoading && isAuthenticated) {
    return <Navigate to={defaultAfterAuth} replace />
  }

  if (isLoading) {
    return (
      <PageWrapper variant="landing" className="items-center justify-center">
        <Spinner label="Loading session" />
      </PageWrapper>
    )
  }

  async function onSignIn(values: LoginFormValues) {
    if (authSubmitLock.current) {
      return
    }
    authSubmitLock.current = true
    setSignInError(null)
    try {
      await signIn(values.email, values.password)
      navigate(resolvePostAuthPath(returnPath, useAuthStore.getState().profile), { replace: true })
    } catch (err) {
      console.error('[LoginPage] sign in failed', err)
      setSignInError(formatAuthError(err))
    } finally {
      authSubmitLock.current = false
    }
  }

  async function onSignUp(values: SignupFormValues) {
    if (authSubmitLock.current) {
      return
    }
    authSubmitLock.current = true
    setSignUpError(null)
    try {
      const data = await signUp(values.email, values.password, values.fullName, values.phone, returnPath)
      if (data.session) {
        navigate(resolvePostAuthPath(returnPath, useAuthStore.getState().profile), { replace: true })
        return
      }
      setSignUpError('Account created. Check your email to confirm, then sign in.')
      setTab('signin')
      signInForm.setValue('email', values.email)
    } catch (err) {
      console.error('[LoginPage] sign up failed', err)
      setSignUpError(formatAuthError(err))
    } finally {
      authSubmitLock.current = false
    }
  }

  return (
    <PageWrapper variant="landing" className="items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl text-white sm:text-4xl">Velox VIP</h1>
          <p className="mt-2 text-sm text-velox-muted">Sign in to manage journeys, or create a client account.</p>
        </div>

        {redirectingToBook ? (
          <div className="mb-4 rounded-xl border border-velox-gold/30 bg-velox-gold/[0.08] px-4 py-3 text-left">
            <p className="text-sm font-medium text-velox-gold-light">Continue to your booking</p>
            <p className="mt-1 text-xs leading-relaxed text-white/75">
              Velox VIP bookings use a signed-in account. Create your client profile (confirm the email we send),
              or sign in if you already have one — then you will return to the booking page to choose your vehicle
              and pay.
            </p>
          </div>
        ) : null}

        <Card hoverGlow className="border-white/10 shadow-2xl shadow-black/50">
          <div className="mb-6 flex rounded-xl border border-white/10 bg-black/20 p-1">
            <button
              type="button"
              className={cn(
                'flex-1 rounded-lg py-2.5 text-sm font-medium transition',
                tab === 'signin'
                  ? 'bg-white/10 text-velox-gold-light shadow-inner'
                  : 'text-white/50 hover:text-white/80',
              )}
              onClick={() => {
                setTab('signin')
                setSignInError(null)
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={cn(
                'flex-1 rounded-lg py-2.5 text-sm font-medium transition',
                tab === 'signup'
                  ? 'bg-white/10 text-velox-gold-light shadow-inner'
                  : 'text-white/50 hover:text-white/80',
              )}
              onClick={() => {
                setTab('signup')
                setSignUpError(null)
              }}
            >
              Sign up
            </button>
          </div>

          {tab === 'signin' ? (
            <form className="space-y-4" onSubmit={signInForm.handleSubmit(onSignIn)} noValidate>
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                error={signInForm.formState.errors.email?.message}
                {...signInForm.register('email')}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                error={signInForm.formState.errors.password?.message}
                {...signInForm.register('password')}
              />
              {signInError ? <p className="text-sm text-red-200">{signInError}</p> : null}
              <Button type="submit" className="w-full" isLoading={signInForm.formState.isSubmitting}>
                Sign in
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={signUpForm.handleSubmit(onSignUp)} noValidate>
              <Input
                label="Full name"
                autoComplete="name"
                error={signUpForm.formState.errors.fullName?.message}
                {...signUpForm.register('fullName')}
              />
              <Input
                label="Phone"
                type="tel"
                autoComplete="tel"
                error={signUpForm.formState.errors.phone?.message}
                {...signUpForm.register('phone')}
              />
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                error={signUpForm.formState.errors.email?.message}
                {...signUpForm.register('email')}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="new-password"
                error={signUpForm.formState.errors.password?.message}
                {...signUpForm.register('password')}
              />
              <Input
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                error={signUpForm.formState.errors.confirmPassword?.message}
                {...signUpForm.register('confirmPassword')}
              />
              {signUpError ? (
                <p className={cn('text-sm', signUpError.startsWith('Account created') ? 'text-emerald-200' : 'text-red-200')}>
                  {signUpError}
                </p>
              ) : null}
              <Button type="submit" className="w-full" isLoading={signUpForm.formState.isSubmitting}>
                Create account
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-velox-muted">
            <Link className="text-velox-gold-light underline underline-offset-2" to={ROUTES.home}>
              Back to home
            </Link>
          </p>
        </Card>
      </div>
    </PageWrapper>
  )
}

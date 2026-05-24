import { describe, expect, it } from 'vitest'
import {
  emailConfirmRedirectFlashMessage,
  formatAuthError,
  isPkceVerifierMissingError,
} from '@/services/authService'

describe('isPkceVerifierMissingError', () => {
  it('detects Supabase PKCE storage message', () => {
    expect(
      isPkceVerifierMissingError(
        new Error('PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device'),
      ),
    ).toBe(true)
  })
})

describe('emailConfirmRedirectFlashMessage', () => {
  it('maps PKCE miss to a sign-in prompt', () => {
    const msg = emailConfirmRedirectFlashMessage(
      new Error('PKCE code verifier not found in storage'),
    )
    expect(msg).toContain('email is confirmed')
    expect(msg).toContain('Sign in')
  })

  it('passes through other errors', () => {
    expect(emailConfirmRedirectFlashMessage(new Error('Link expired'))).toBe('Link expired')
  })
})

describe('formatAuthError', () => {
  it('rewrites PKCE errors for end users', () => {
    const msg = formatAuthError(new Error('PKCE code verifier not found in storage'))
    expect(msg).not.toContain('PKCE')
  })
})

// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

// Handles the redirect from Supabase after OAuth.
// Supabase appends: #access_token=...&token_type=bearer&type=signup|login&...
// We extract the access token, exchange it for our JWT, then navigate to dashboard.

import { useEffect, useState } from 'react'
import { apiClient } from '../lib/api-client'
import { setToken } from '../lib/auth'

interface AuthCallbackPageProps {
  onLogin: () => void
}

interface SSOExchangeResponse {
  token: string
  user: unknown
}

export function AuthCallbackPage({ onLogin }: AuthCallbackPageProps) {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const hash = window.location.hash

    // No hash: either the user navigated here directly, or the hash was already
    // consumed and cleared by a previous run of this effect (React StrictMode
    // fires effects twice in dev). In both cases just return — App.tsx state
    // handles routing (shows login if not logged in, dashboard if logged in).
    if (!hash) {
      return
    }

    const params = new URLSearchParams(hash.replace(/^#/, ''))
    const errorCode = params.get('error')
    const errorDescription = params.get('error_description')
    const accessToken = params.get('access_token')

    // Clear the hash immediately so React StrictMode's second effect run
    // sees no token and exits early, preventing a duplicate exchange call.
    window.history.replaceState(null, '', window.location.pathname + window.location.search)

    if (errorCode) {
      setError(errorDescription ?? errorCode)
      return
    }

    if (!accessToken) {
      return
    }

    apiClient
      .post<SSOExchangeResponse>('/auth/sso/exchange', { accessToken })
      .then(({ token }) => {
        setToken(token)
        // Navigate away from /auth/callback before calling onLogin so App.tsx
        // doesn't re-render the callback page again (it checks window.location.pathname).
        window.history.replaceState(null, '', '/')
        onLogin()
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
      })
  }, [onLogin])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-4 dark:bg-gray-950">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
          <a
            href="/"
            className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            Back to login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-gray-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      <p className="text-sm text-gray-500 dark:text-gray-400">Signing you in…</p>
    </div>
  )
}

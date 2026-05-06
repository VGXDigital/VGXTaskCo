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

    // If no hash at all, the user navigated here directly — send them to login
    if (!hash) {
      window.location.replace('/')
      return
    }

    const params = new URLSearchParams(hash.replace(/^#/, ''))
    const errorCode = params.get('error')
    const errorDescription = params.get('error_description')
    const accessToken = params.get('access_token')

    if (errorCode) {
      setError(errorDescription ?? errorCode)
      return
    }

    if (!accessToken) {
      window.location.replace('/')
      return
    }

    apiClient
      .post<SSOExchangeResponse>('/auth/sso/exchange', { accessToken })
      .then(({ token }) => {
        setToken(token)
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

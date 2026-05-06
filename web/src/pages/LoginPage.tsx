// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { apiClient } from '../lib/api-client'
import { setToken } from '../lib/auth'
import { getSSOUrl } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { VGXFooter } from '../components/layout/VGXFooter'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type LoginFields = z.infer<typeof loginSchema>
type RegisterFields = z.infer<typeof registerSchema>

interface AuthResponse {
  token: string
}

interface LoginPageProps {
  onLogin: () => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains('dark'))
  }, [])

  const loginForm = useForm<LoginFields>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterFields>({ resolver: zodResolver(registerSchema) })

  async function handleLogin(values: LoginFields) {
    setLoading(true)
    try {
      const res = await apiClient.post<AuthResponse>('/auth/login', values)
      setToken(res.token)
      onLogin()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(values: RegisterFields) {
    setLoading(true)
    try {
      const { confirmPassword: _, ...payload } = values
      const res = await apiClient.post<AuthResponse>('/auth/register', payload)
      setToken(res.token)
      toast.success('Account created!')
      onLogin()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950 lg:flex-row">

      {/* Left panel — masterclass promo, hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between bg-vgx-gradient p-12 text-white">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <img src="/vgx-dark.webp" alt="VGX" className="h-9 w-auto object-contain" />
            <span className="font-display text-2xl font-semibold tracking-tight">TaskCo</span>
          </div>

          <h2 className="font-display text-4xl font-bold leading-tight mb-4">
            AI-Powered Development<br />with Claude
          </h2>
          <p className="text-white/70 text-lg mb-10">
            The reference implementation built live during the VGX masterclass — every commit, prompt, and architectural decision traceable from day one.
          </p>

          <ul className="space-y-4">
            {[
              'Full-stack TypeScript — Fastify, Prisma, React 19',
              'Production auth — JWT + Google & GitHub SSO',
              'Real deployment — Fly.io backend, Vercel frontend',
              'AI-assisted workflow — 60+ structured build prompts',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-white/80 text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <a
            href="https://vgx.guru"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            Learn more at vgx.guru
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 lg:p-12">

        {/* Mobile-only logo */}
        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <img
            src={darkMode ? '/vgx-dark.webp' : '/vgx-light.webp'}
            alt="VGX"
            className="h-10 w-auto object-contain"
          />
          <h1 className="font-display text-xl font-bold text-gray-900 dark:text-gray-100">TaskCo</h1>
          <div className="h-1 w-16 rounded-full bg-vgx-gradient" />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-6 hidden lg:block">
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome back</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Sign in to your TaskCo account</p>
          </div>

          {/* SSO buttons */}
          <div className="mb-6 flex flex-col gap-2">
            <button
              onClick={() => { window.location.href = getSSOUrl('google', `${window.location.origin}/auth/callback`) }}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button
              onClick={() => { window.location.href = getSSOUrl('github', `${window.location.origin}/auth/callback`) }}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
              </svg>
              Continue with GitHub
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-gray-50 px-2 text-gray-400 dark:bg-gray-950 dark:text-gray-500">or continue with email</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  'flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition-all',
                  tab === t
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                ].join(' ')}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Login form */}
          {tab === 'login' && (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                error={loginForm.formState.errors.email?.message}
                {...loginForm.register('email')}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                error={loginForm.formState.errors.password?.message}
                {...loginForm.register('password')}
              />
              <Button type="submit" loading={loading} className="mt-2 w-full">
                {loading ? null : 'Sign in'}
              </Button>
            </form>
          )}

          {/* Register form */}
          {tab === 'register' && (
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="flex flex-col gap-4">
              <Input
                label="Full name"
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
                error={registerForm.formState.errors.name?.message}
                {...registerForm.register('name')}
              />
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                error={registerForm.formState.errors.email?.message}
                {...registerForm.register('email')}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="new-password"
                placeholder="Min 6 characters"
                error={registerForm.formState.errors.password?.message}
                {...registerForm.register('password')}
              />
              <Input
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                error={registerForm.formState.errors.confirmPassword?.message}
                {...registerForm.register('confirmPassword')}
              />
              <Button type="submit" loading={loading} className="mt-2 w-full">
                {loading ? null : 'Create account'}
              </Button>
            </form>
          )}

          <div className="mt-8 text-center">
            <VGXFooter />
          </div>
        </div>
      </div>
    </div>
  )
}

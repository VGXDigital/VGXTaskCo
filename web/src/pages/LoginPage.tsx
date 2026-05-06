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

interface AuthResponse { token: string }
interface LoginPageProps { onLogin: () => void }

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
    <div
      className="relative flex min-h-screen flex-col items-center justify-center p-4 overflow-hidden"
      style={{ background: '#05050a url(/login-bg.png) center/cover no-repeat' }}
    >
      {/* Dark overlay to ensure dialog readability */}
      <div className="pointer-events-none absolute inset-0 bg-black/40" />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-gray-900/80 p-8 shadow-2xl shadow-black/60 backdrop-blur-xl">

        {/* Brand */}
        <div className="mb-7 flex flex-col items-center gap-3">
          <img
            src={darkMode ? '/vgx-dark.webp' : '/vgx-dark.webp'}
            alt="VGX"
            className="h-10 w-auto object-contain"
          />
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-white">TaskCo</h1>
            <p className="text-sm text-white/40">AI-Powered Development Masterclass</p>
          </div>
          <div className="h-0.5 w-16 rounded-full bg-vgx-gradient" />
        </div>

        {/* SSO buttons */}
        <div className="mb-6 flex flex-col gap-2">
          <button
            onClick={() => { window.location.href = getSSOUrl('google', `${window.location.origin}/auth/callback`) }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
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
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
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
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-gray-900 px-2 text-white/30">or continue with email</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex rounded-lg bg-white/5 p-1">
          {(['login', 'register'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition-all',
                tab === t
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-white/40 hover:text-white/70',
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
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-6 text-center">
        <VGXFooter />
      </div>
    </div>
  )
}

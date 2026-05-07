// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { isLoggedIn } from './lib/auth'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { CrossProjectViewPage } from './pages/CrossProjectViewPage'
import { SettingsApiTokensPage } from './pages/SettingsApiTokensPage'
import { SettingsWebhooksPage } from './pages/SettingsWebhooksPage'
import { AppShell } from './components/layout/AppShell'
import { AuthCallbackPage } from './pages/AuthCallbackPage'

const DARK_KEY = 'vgxt-dark'

function getInitialDark(): boolean {
  const stored = localStorage.getItem(DARK_KEY)
  if (stored !== null) return stored === 'true'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

type Route =
  | { page: 'dashboard' }
  | { page: 'projects' }
  | { page: 'project'; id: string }
  | { page: 'view'; id: string }
  | { page: 'settings-tokens' }
  | { page: 'settings-webhooks' }

export function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn())
  const [darkMode, setDarkMode] = useState(getInitialDark)
  const [route, setRoute] = useState<Route>({ page: 'dashboard' })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem(DARK_KEY, String(darkMode))
  }, [darkMode])

  function handleLogin() {
    setLoggedIn(isLoggedIn())
  }

  function navigate(next: Route) {
    setRoute(next)
  }

  // /login path — show LoginPage regardless of auth state so that direct
  // navigation to /login (e.g. Playwright E2E tests) always renders SSO buttons.
  if (window.location.pathname === '/login') {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster richColors position="top-right" />
      </>
    )
  }

  // OAuth callback — must be checked before the loggedIn gate so Supabase
  // redirects land here even when there is no session yet.
  if (window.location.pathname === '/auth/callback') {
    return (
      <>
        <AuthCallbackPage onLogin={handleLogin} />
        <Toaster richColors position="top-right" />
      </>
    )
  }

  if (!loggedIn) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster richColors position="top-right" />
      </>
    )
  }

  function renderPage() {
    switch (route.page) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigateToProject={(id) => navigate({ page: 'project', id })}
          />
        )
      case 'projects':
        return (
          <ProjectsPage
            onNavigateToProject={(id) => navigate({ page: 'project', id })}
          />
        )
      case 'project':
        return (
          <ProjectDetailPage
            projectId={route.id}
            onBack={() => navigate({ page: 'projects' })}
          />
        )
      case 'view':
        return (
          <CrossProjectViewPage
            viewId={route.id}
            onBack={() => navigate({ page: 'dashboard' })}
          />
        )
      case 'settings-tokens':
        return <SettingsApiTokensPage />
      case 'settings-webhooks':
        return <SettingsWebhooksPage />
    }
  }

  return (
    <>
      <AppShell
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        currentPage={route.page}
        onNavigate={navigate}
      >
        {renderPage()}
      </AppShell>
      <Toaster richColors position="top-right" />
    </>
  )
}

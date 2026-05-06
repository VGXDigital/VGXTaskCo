// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronRight,
  Eye,
  FolderKanban,
  Key,
  LayoutDashboard,
  Link,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  X,
} from 'lucide-react'
import { apiClient } from '../../lib/api-client'
import { VGXFooter } from './VGXFooter'
import { clearToken } from '../../lib/auth'
import { useViews } from '../../hooks/useViews'
import type { Project } from '../../types'

type RoutePage = 'dashboard' | 'projects' | 'project' | 'view' | 'settings-tokens' | 'settings-webhooks'

type NavigateArg =
  | { page: 'dashboard' }
  | { page: 'projects' }
  | { page: 'project'; id: string }
  | { page: 'view'; id: string }
  | { page: 'settings-tokens' }
  | { page: 'settings-webhooks' }

interface AppShellProps {
  children: React.ReactNode
  darkMode: boolean
  onToggleDark: () => void
  currentPage: RoutePage
  onNavigate: (route: NavigateArg) => void
}

export function AppShell({
  children,
  darkMode,
  onToggleDark,
  currentPage,
  onNavigate,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const { data: projects } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => apiClient.get<Project[]>('/projects'),
  })

  const { data: views } = useViews()

  function handleLogout() {
    clearToken()
    window.location.reload()
  }

  const sidebarVariants = {
    open: { width: 280, opacity: 1, x: 0 },
    closed: { width: 0, opacity: 0, x: -20 },
  }

  const navItems: Array<{ label: string; route: NavigateArg; icon: React.ReactNode }> = [
    {
      label: 'Dashboard',
      route: { page: 'dashboard' },
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: 'Projects',
      route: { page: 'projects' },
      icon: <FolderKanban className="h-5 w-5" />,
    },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 z-20 bg-black/40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            variants={sidebarVariants}
            initial="closed"
            animate="open"
            exit="closed"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 z-30 flex h-full flex-col overflow-hidden border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:relative lg:z-auto"
            style={{ minWidth: 0 }}
          >
            {/* Logo */}
            <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4 dark:border-gray-800">
              <img
                src={darkMode ? '/vgx-dark.webp' : '/vgx-light.webp'}
                alt="VGX"
                className="h-7 w-auto object-contain"
              />
              <span className="whitespace-nowrap font-display font-semibold text-primary dark:text-primary-300">
                TaskCo
              </span>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-2 py-4">
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.label}>
                    <button
                      onClick={() => onNavigate(item.route)}
                      className={[
                        'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-base font-medium transition-colors',
                        currentPage === item.route.page
                          ? 'bg-primary/10 text-primary dark:bg-primary/20'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                      ].join(' ')}
                    >
                      {item.icon}
                      <span className="whitespace-nowrap">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>

              {/* Projects */}
              {projects && projects.length > 0 && (
                <div className="mt-6">
                  <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Projects
                  </p>
                  <ul className="space-y-0.5">
                    {projects.map((project) => (
                      <li key={project.id}>
                        <button
                          onClick={() => onNavigate({ page: 'project' as const, id: project.id })}
                          className={[
                            'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                            currentPage === 'project'
                              ? 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
                          ].join(' ')}
                        >
                          <span
                            className="h-2 w-2 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          <span className="truncate">{project.name}</span>
                          {project._count && (
                            <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                              {project._count.tasks}
                            </span>
                          )}
                          <ChevronRight className="h-3 w-3 flex-shrink-0 text-gray-400" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quick views */}
              {views && views.length > 0 && (
                <div className="mt-6">
                  <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Views
                  </p>
                  <ul className="space-y-0.5">
                    {views.map((view) => (
                      <li key={view.id}>
                        <button
                          onClick={() => onNavigate({ page: 'view', id: view.id })}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          <Eye className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                          <span className="truncate">{view.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Settings */}
              <div className="mt-6">
                <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  <Settings className="mb-0.5 mr-1 inline h-3 w-3" />
                  Settings
                </p>
                <ul className="space-y-0.5">
                  <li>
                    <button
                      onClick={() => onNavigate({ page: 'settings-tokens' })}
                      className={[
                        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                        currentPage === 'settings-tokens'
                          ? 'bg-primary/10 text-primary dark:bg-primary/20'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
                      ].join(' ')}
                    >
                      <Key className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="whitespace-nowrap">API Tokens</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onNavigate({ page: 'settings-webhooks' })}
                      className={[
                        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                        currentPage === 'settings-webhooks'
                          ? 'bg-primary/10 text-primary dark:bg-primary/20'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
                      ].join(' ')}
                    >
                      <Link className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="whitespace-nowrap">Webhooks</span>
                    </button>
                  </li>
                </ul>
              </div>
            </nav>

            <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
              <VGXFooter />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex-1" />

          <button
            onClick={onToggleDark}
            className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
      </div>
    </div>
  )
}

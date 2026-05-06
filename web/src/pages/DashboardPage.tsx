// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Clock, FolderKanban, Plus } from 'lucide-react'
import { isPast, parseISO } from 'date-fns'
import { apiClient } from '../lib/api-client'
import { useProjects } from '../hooks/useProjects'
import { useTasks } from '../hooks/useTasks'
import { CreateTaskModal } from '../components/tasks/CreateTaskModal'
import { Button } from '../components/ui/Button'
import type { Task, User } from '../types'

function isOverdueTask(t: Task): boolean {
  return Boolean(t.dueDate) && t.status !== 'DONE' && isPast(parseISO(t.dueDate!))
}

function isDueTodayTask(t: Task): boolean {
  if (!t.dueDate || t.status === 'DONE') return false
  const d = parseISO(t.dueDate)
  const today = new Date()
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}

// Fetch all tasks for the first project (used for stats). Disabled when no project exists.
function useFirstProjectTasks(projectId?: string) {
  return useTasks(projectId ?? '', undefined, { enabled: !!projectId })
}

interface DashboardPageProps {
  onNavigateToProject: (id: string) => void
}

export function DashboardPage({ onNavigateToProject }: DashboardPageProps) {
  const { data: me, isLoading: meLoading } = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => apiClient.get<User>('/auth/me'),
  })

  const { data: projects = [], isLoading: projectsLoading } = useProjects()
  const recentProjects = projects.slice(0, 5)
  const firstProjectId = projects[0]?.id

  const { data: firstProjectTasks = [] } = useFirstProjectTasks(firstProjectId)

  const dueTodayCount = firstProjectTasks.filter(isDueTodayTask).length
  const overdueCount = firstProjectTasks.filter(isOverdueTask).length

  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const loading = meLoading || projectsLoading

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Welcome{me?.name ? `, ${me.name}` : ''}
          </h1>
          <p className="text-base text-gray-500 dark:text-gray-400">Here's an overview of your workspace.</p>
        </div>
        {firstProjectId && (
          <Button onClick={() => setQuickAddOpen(true)} size="sm">
            <Plus className="h-4 w-4" />
            Quick task
          </Button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<FolderKanban className="h-5 w-5 text-primary" />}
          iconBg="bg-primary/10 dark:bg-primary/20"
          value={projects.length}
          label={projects.length === 1 ? 'Project' : 'Projects'}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          iconBg="bg-amber-50 dark:bg-amber-900/20"
          value={dueTodayCount}
          label={dueTodayCount === 1 ? 'Task due today' : 'Tasks due today'}
        />
        <StatCard
          icon={<AlertCircle className="h-5 w-5 text-red-500" />}
          iconBg="bg-red-50 dark:bg-red-900/20"
          value={overdueCount}
          label={overdueCount === 1 ? 'Overdue task' : 'Overdue tasks'}
          danger={overdueCount > 0}
        />
      </div>

      {/* Recent projects */}
      {recentProjects.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Recent Projects
          </h2>
          <ul className="space-y-2">
            {recentProjects.map((project) => (
              <li key={project.id}>
                <button
                  onClick={() => onNavigateToProject(project.id)}
                  className="flex w-full items-center gap-4 rounded-xl bg-white p-5 text-left shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md dark:bg-gray-900 dark:ring-gray-800"
                >
                  <span
                    className="h-4 w-4 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="flex-1 text-base font-medium text-gray-800 dark:text-gray-200">
                    {project.name}
                  </span>
                  {project.description && (
                    <span className="hidden truncate text-sm text-gray-400 sm:block max-w-xs">
                      {project.description}
                    </span>
                  )}
                  <span className="text-sm text-gray-400 dark:text-gray-500">
                    {project._count?.tasks ?? 0} tasks
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick add modal */}
      {firstProjectId && (
        <CreateTaskModal
          projectId={firstProjectId}
          open={quickAddOpen}
          onClose={() => setQuickAddOpen(false)}
        />
      )}
    </div>
  )
}

function StatCard({
  icon,
  iconBg,
  value,
  label,
  danger = false,
}: {
  icon: React.ReactNode
  iconBg: string
  value: number
  label: string
  danger?: boolean
}) {
  return (
    <div className="flex items-center gap-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <div className={['flex h-12 w-12 items-center justify-center rounded-xl', iconBg].join(' ')}>
        {icon}
      </div>
      <div>
        <p
          className={[
            'text-3xl font-bold',
            danger ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100',
          ].join(' ')}
        >
          {value}
        </p>
        <p className="text-base text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  )
}

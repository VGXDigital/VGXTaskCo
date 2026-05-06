// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useRef, useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '../lib/api-client'
import { buildTaskQueryString } from '../lib/query'
import { useViews, useUpdateView, useDeleteView } from '../hooks/useViews'
import { useProjects } from '../hooks/useProjects'
import { TaskCard } from '../components/tasks/TaskCard'
import { TaskDetailModal } from '../components/tasks/TaskDetailModal'
import { Button } from '../components/ui/Button'
import type { Project, SavedView, Task } from '../types'

interface CrossProjectViewPageProps {
  viewId: string
  onBack: () => void
}

function buildProjectTasksUrl(projectId: string, filter: SavedView['filter']): string {
  const qs = buildTaskQueryString({
    dueWithin: filter.dueWithin,
    search: filter.search,
    includeArchived: filter.includeArchived,
    priority: filter.priority && filter.priority.length === 1 ? filter.priority[0] : undefined,
    status: filter.status && filter.status.length === 1 ? filter.status[0] : undefined,
  })
  return `/projects/${projectId}/tasks${qs}`
}

function useAllProjectTasks(projects: Project[] | undefined, filter: SavedView['filter']) {
  return useQuery<Array<Task & { projectName: string; projectColor: string }>>({
    queryKey: ['cross-view-tasks', projects?.map((p) => p.id), filter],
    enabled: Boolean(projects && projects.length > 0),
    queryFn: async () => {
      if (!projects) return []
      const results = await Promise.all(
        projects.map((project) =>
          apiClient
            .get<Task[]>(buildProjectTasksUrl(project.id, filter))
            .then((tasks) =>
              tasks.map((t) => ({
                ...t,
                projectName: project.name,
                projectColor: project.color,
              }))
            )
            .catch(() => [] as Array<Task & { projectName: string; projectColor: string }>)
        )
      )
      return results.flat()
    },
  })
}

export function CrossProjectViewPage({ viewId, onBack }: CrossProjectViewPageProps) {
  const { data: views, isLoading: viewsLoading } = useViews()
  const { data: projects, isLoading: projectsLoading } = useProjects()
  const updateView = useUpdateView()
  const deleteView = useDeleteView()

  const view = views?.find((v) => v.id === viewId)

  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(view?.name ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const { data: tasks = [], isLoading: tasksLoading } = useAllProjectTasks(
    projects,
    view?.filter ?? {}
  )

  function handleNameBlur() {
    if (!view) return
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== view.name) {
      updateView.mutate(
        { id: view.id, data: { name: trimmed } },
        {
          onError: () => setNameValue(view.name),
        }
      )
    } else {
      setNameValue(view.name)
    }
    setEditingName(false)
  }

  function handleDeleteConfirmed() {
    if (!view) return
    deleteView.mutate(view.id, {
      onSuccess: () => {
        toast.success('View deleted')
        onBack()
      },
    })
  }

  const isLoading = viewsLoading || projectsLoading

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!view) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-gray-500 dark:text-gray-400">View not found.</p>
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex flex-1 items-center gap-2">
          {editingName ? (
            <input
              ref={nameInputRef}
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') nameInputRef.current?.blur()
                if (e.key === 'Escape') {
                  setNameValue(view.name)
                  setEditingName(false)
                }
              }}
              className="rounded-md border border-primary bg-white px-2 py-1 text-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-900 dark:text-gray-100"
            />
          ) : (
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{view.name}</h1>
          )}

          {!editingName && (
            <button
              onClick={() => {
                setNameValue(view.name)
                setEditingName(true)
              }}
              className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              Edit
            </button>
          )}
        </div>

        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Delete this view?</span>
            <Button
              size="sm"
              variant="danger"
              loading={deleteView.isPending}
              onClick={handleDeleteConfirmed}
            >
              Confirm
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        )}
      </div>

      {/* Task list */}
      {tasksLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl bg-white ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
          <p className="text-sm text-gray-400 dark:text-gray-500">No tasks match this view</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-stretch gap-2">
              <span
                className="flex items-center rounded-l-md px-2 text-xs font-medium text-white"
                style={{ backgroundColor: task.projectColor }}
              >
                {task.projectName}
              </span>
              <div className="flex-1">
                <TaskCard task={task} onClick={() => setSelectedTaskId(task.id)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          open={true}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  )
}

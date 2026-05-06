// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { FolderKanban, Plus } from 'lucide-react'
import { useProjects, useCreateProject } from '../hooks/useProjects'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import type { Project } from '../types'

const PRESET_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 chars or fewer'),
  description: z.string().optional(),
  color: z.string().min(1, 'Pick a color'),
})

type FormValues = z.infer<typeof schema>

interface ProjectsPageProps {
  onNavigateToProject: (id: string) => void
}

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const taskCount = project._count?.tasks ?? 0
  return (
    <button
      onClick={onClick}
      className="group flex flex-col rounded-xl bg-white p-5 text-left shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md hover:ring-gray-300 dark:bg-gray-900 dark:ring-gray-800 dark:hover:ring-gray-700"
    >
      <div className="mb-3 flex items-center gap-3">
        <span
          className="h-3 w-3 flex-shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900"
          style={{ backgroundColor: project.color }}
        />
        <h3 className="font-semibold text-gray-900 group-hover:text-primary dark:text-gray-100 dark:group-hover:text-blue-400">
          {project.name}
        </h3>
      </div>
      {project.description && (
        <p className="mb-3 flex-1 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">
          {project.description}
        </p>
      )}
      <div className="mt-auto flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
        <FolderKanban className="h-3.5 w-3.5" />
        {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
      </div>
    </button>
  )
}

function NewProjectModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const createProject = useCreateProject()
  const [pickedColor, setPickedColor] = useState(PRESET_COLORS[0])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', color: PRESET_COLORS[0] },
  })

  async function onSubmit(values: FormValues) {
    try {
      const res = await createProject.mutateAsync({ ...values, color: pickedColor })
      toast.success('Project created')
      reset()
      setPickedColor(PRESET_COLORS[0])
      onCreated(res.data.id)
    } catch {
      // already toasted
    }
  }

  function handleClose() {
    reset()
    setPickedColor(PRESET_COLORS[0])
    onClose()
  }

  return (
    <Modal open={open} onOpenChange={(o) => !o && handleClose()} title="New Project">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Project name"
          placeholder="My project"
          error={errors.name?.message}
          {...register('name')}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            rows={2}
            placeholder="Optional description…"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            {...register('description')}
          />
        </div>

        {/* Color picker */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
          <div className="flex items-center gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setPickedColor(c)}
                className="h-7 w-7 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  backgroundColor: c,
                  outline: pickedColor === c ? `3px solid ${c}` : undefined,
                  outlineOffset: pickedColor === c ? '2px' : undefined,
                }}
                aria-label={`Pick color ${c}`}
              />
            ))}
            <input
              type="color"
              value={pickedColor}
              onChange={(e) => setPickedColor(e.target.value)}
              className="h-7 w-7 cursor-pointer rounded border border-gray-300 bg-transparent p-0 dark:border-gray-600"
              title="Custom color"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export function ProjectsPage({ onNavigateToProject }: ProjectsPageProps) {
  const { data: projects = [], isLoading } = useProjects()
  const [modalOpen, setModalOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 dark:border-gray-800">
          <FolderKanban className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="mb-4 text-gray-500 dark:text-gray-400">No projects yet</p>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Create your first project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => onNavigateToProject(project.id)}
            />
          ))}
        </div>
      )}

      <NewProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(id) => {
          setModalOpen(false)
          onNavigateToProject(id)
        }}
      />
    </div>
  )
}

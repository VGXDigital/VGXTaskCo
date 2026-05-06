// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, useDroppable, useDraggable, DragOverlay } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ArrowLeft, BookmarkPlus, ChevronDown, Edit2, Plus, Search } from 'lucide-react'
import { ExportButton } from '../components/export/ExportButton'
import * as Popover from '@radix-ui/react-popover'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useProject, useUpdateProject } from '../hooks/useProjects'
import { useTasks, useUpdateTask } from '../hooks/useTasks'
import { buildTaskQueryString } from '../lib/query'
import { useProjectViews, useCreateView } from '../hooks/useViews'
import { TaskCard } from '../components/tasks/TaskCard'
import { CreateTaskModal } from '../components/tasks/CreateTaskModal'
import { TaskDetailModal } from '../components/tasks/TaskDetailModal'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import type { Task, TaskStatus } from '../types'

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'TODO', label: 'To Do' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'DONE', label: 'Done' },
]

type PriorityFilter = 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'
type DueFilter = 'ALL' | 'today' | 'thisWeek' | 'overdue'


const editSchema = z.object({
  name: z.string().min(1, 'Required').max(100),
  description: z.string().optional(),
})
type EditForm = z.infer<typeof editSchema>

const PRESET_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

function DraggableCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      className="touch-none"
    >
      <TaskCard task={task} onClick={onClick} />
    </div>
  )
}

function KanbanColumn({
  status, label, tasks, onAddTask, onTaskClick,
}: {
  status: string; label: string; tasks: Task[]; onAddTask: () => void; onTaskClick: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl p-3 ring-1 transition-colors ${
        isOver
          ? 'bg-primary/5 ring-primary/30 dark:bg-primary/10'
          : 'bg-gray-50 ring-gray-200 dark:bg-gray-900/50 dark:ring-gray-800'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {label}
          <span className="ml-1.5 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs font-normal text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {tasks.length}
          </span>
        </span>
        <button
          onClick={onAddTask}
          className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label={`Add task to ${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <DraggableCard key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
        ))}
        {tasks.length === 0 && (
          <p className="py-4 text-center text-xs text-gray-400 dark:text-gray-600">No tasks</p>
        )}
      </div>

      <button
        onClick={onAddTask}
        className="mt-3 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
      >
        <Plus className="h-3.5 w-3.5" />
        Add task
      </button>
    </div>
  )
}

function EditProjectModal({
  projectId,
  open,
  onClose,
}: {
  projectId: string
  open: boolean
  onClose: () => void
}) {
  const { data: project } = useProject(projectId)
  const updateProject = useUpdateProject()
  const [color, setColor] = useState(project?.color ?? PRESET_COLORS[0])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: { name: project?.name ?? '', description: project?.description ?? '' },
  })

  async function onSubmit(values: EditForm) {
    try {
      await updateProject.mutateAsync({ id: projectId, data: { ...values, color } })
      toast.success('Project updated')
      onClose()
    } catch {
      // already toasted
    }
  }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Edit Project">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Name" error={errors.name?.message} {...register('name')} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            rows={2}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            {...register('description')}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
          <div className="flex items-center gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="h-7 w-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                style={{
                  backgroundColor: c,
                  outline: color === c ? `3px solid ${c}` : undefined,
                  outlineOffset: color === c ? '2px' : undefined,
                }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-7 w-7 cursor-pointer rounded border border-gray-300 bg-transparent p-0 dark:border-gray-600"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Save</Button>
        </div>
      </form>
    </Modal>
  )
}

interface ProjectDetailPageProps {
  projectId: string
  onBack: () => void
}

export function ProjectDetailPage({ projectId, onBack }: ProjectDetailPageProps) {
  const { data: project, isLoading: projectLoading } = useProject(projectId)

  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL')
  const [dueFilter, setDueFilter] = useState<DueFilter>('ALL')
  const [searchRaw, setSearchRaw] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)

  const search = useDeferredValue(searchRaw)

  const { data: tasks = [], isLoading: tasksLoading } = useTasks(projectId, {
    priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
    dueWithin: dueFilter !== 'ALL' ? dueFilter : undefined,
    search: search || undefined,
    includeArchived,
  })

  const updateTask = useUpdateTask()
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const taskId = String(active.id)
    const newStatus = String(over.id) as TaskStatus
    const validStatuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE']
    if (!validStatuses.includes(newStatus)) return
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return
    updateTask.mutate({ id: taskId, data: { status: newStatus }, projectId })
    setActiveTaskId(null)
  }

  const { data: projectViews = [] } = useProjectViews(projectId)
  const createView = useCreateView()
  const [viewsOpen, setViewsOpen] = useState(false)
  const [savingView, setSavingView] = useState(false)
  const [viewName, setViewName] = useState('')
  const viewNameRef = useRef<HTMLInputElement>(null)

  function handleSaveView() {
    const name = viewName.trim()
    if (!name) return
    createView.mutate(
      {
        name,
        scope: 'project',
        projectId,
        filter: {
          priority: priorityFilter !== 'ALL' ? ([priorityFilter] as import('../types').Priority[]) : undefined,
          dueWithin: dueFilter !== 'ALL' ? (dueFilter as import('../types').SavedViewFilter['dueWithin']) : undefined,
          search: search || undefined,
          includeArchived: includeArchived || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('View saved')
          setViewName('')
          setSavingView(false)
          setViewsOpen(false)
        },
      }
    )
  }

  const [createStatus, setCreateStatus] = useState<TaskStatus | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  // N shortcut opens new task modal (skip if typing in an input)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (e.key === 'n' || e.key === 'N') setCreateStatus('TODO')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [] }
    tasks.forEach((t) => {
      if (map[t.status]) map[t.status].push(t)
    })
    return map
  }, [tasks])

  const handleTaskClick = useCallback((id: string) => setSelectedTaskId(id), [])

  if (projectLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-gray-500">Project not found.</p>
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Project header */}
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="mt-1 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-1 items-start gap-3">
          <span
            className="mt-1.5 h-4 w-4 flex-shrink-0 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{project.name}</h1>
            {project.description && (
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{project.description}</p>
            )}
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {project._count?.tasks ?? 0} tasks
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton
              projectId={projectId}
              currentFilters={buildTaskQueryString({
                priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
                dueWithin: dueFilter !== 'ALL' ? dueFilter : undefined,
                search: searchRaw || undefined,
                includeArchived: includeArchived || undefined,
              })}
            />
            <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
              <Edit2 className="h-3.5 w-3.5" /> Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Saved views popover */}
      <Popover.Root open={viewsOpen} onOpenChange={setViewsOpen}>
        <Popover.Trigger asChild>
          <button className="flex w-fit items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
            <BookmarkPlus className="h-3.5 w-3.5" />
            Views
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className="z-50 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900"
          >
            {projectViews.length > 0 && (
              <ul className="mb-2 space-y-0.5">
                {projectViews.map((view) => (
                  <li key={view.id}>
                    <button
                      onClick={() => {
                        const f = view.filter
                        if (f.priority && f.priority.length === 1) setPriorityFilter(f.priority[0])
                        if (f.dueWithin) setDueFilter(f.dueWithin === 'doneInLast7Days' ? 'ALL' : f.dueWithin)
                        if (f.search !== undefined) setSearchRaw(f.search)
                        if (f.includeArchived !== undefined) setIncludeArchived(f.includeArchived)
                        setViewsOpen(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      {view.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {projectViews.length > 0 && (
              <div className="mb-2 border-t border-gray-100 dark:border-gray-800" />
            )}
            {savingView ? (
              <div className="flex flex-col gap-2">
                <input
                  ref={viewNameRef}
                  autoFocus
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveView() }}
                  placeholder="View name…"
                  className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
                <div className="flex gap-2">
                  <Button size="sm" loading={createView.isPending} onClick={handleSaveView}>
                    Save
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => { setSavingView(false); setViewName('') }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setSavingView(true)}
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-primary hover:bg-primary/5"
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                Save current filter as view
              </button>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
        {/* Priority */}
        <div className="flex items-center gap-1">
          {(['ALL', 'LOW', 'MEDIUM', 'HIGH'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={[
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                priorityFilter === p
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
              ].join(' ')}
            >
              {p === 'ALL' ? 'All' : p.charAt(0) + p.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Due */}
        <div className="flex items-center gap-1">
          {(['ALL', 'today', 'thisWeek', 'overdue'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDueFilter(d)}
              className={[
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                dueFilter === d
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
              ].join(' ')}
            >
              {d === 'ALL' ? 'All' : d === 'today' ? 'Today' : d === 'thisWeek' ? 'This week' : 'Overdue'}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Search */}
        <div className="relative flex-1 min-w-36">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks…"
            value={searchRaw}
            onChange={(e) => setSearchRaw(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        {/* Archived toggle */}
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="accent-primary"
          />
          Include archived
        </label>
      </div>

      {/* Board */}
      {tasksLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {COLUMNS.map(({ status, label }) => (
              <KanbanColumn
                key={status}
                status={status}
                label={label}
                tasks={tasksByStatus[status]}
                onAddTask={() => setCreateStatus(status)}
                onTaskClick={handleTaskClick}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTaskId && (() => {
              const t = tasks.find(t => t.id === activeTaskId)
              return t ? <div className="rotate-1 opacity-90"><TaskCard task={t} onClick={() => {}} /></div> : null
            })()}
          </DragOverlay>
        </DndContext>
      )}

      {/* Modals */}
      {createStatus && (
        <CreateTaskModal
          projectId={projectId}
          defaultStatus={createStatus}
          open={true}
          onClose={() => setCreateStatus(null)}
        />
      )}

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          open={true}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      <EditProjectModal
        projectId={projectId}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </div>
  )
}

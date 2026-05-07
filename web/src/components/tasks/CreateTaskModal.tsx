// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useEffect, useState, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Sparkles, CalendarDays, Flag, LayoutList, Folder, Clock, AtSign } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Popover from '@radix-ui/react-popover'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useCreateTask } from '../../hooks/useTasks'
import { useProjects } from '../../hooks/useProjects'
import { apiClient } from '../../lib/api-client'
import type { TaskStatus, Project } from '../../types'

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  dueDate: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface ParsedTask {
  title: string
  dueDate: string | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | null
  description: string | null
}

export interface CreateTaskModalProps {
  projectId?: string
  projectName?: string
  defaultStatus?: TaskStatus
  open: boolean
  onClose: () => void
}

const STATUS_OPTIONS = [
  { value: 'TODO' as const, label: 'To Do' },
  { value: 'IN_PROGRESS' as const, label: 'In Progress' },
  { value: 'DONE' as const, label: 'Done' },
]

const PRIORITY_OPTIONS = [
  { value: 'LOW' as const, label: 'Low', color: 'text-green-500' },
  { value: 'MEDIUM' as const, label: 'Medium', color: 'text-yellow-500' },
  { value: 'HIGH' as const, label: 'High', color: 'text-red-500' },
]

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: 'text-red-500',
  MEDIUM: 'text-yellow-500',
  LOW: 'text-green-500',
}

function formatDate(dateStr: string, timeStr: string): string {
  const d = new Date(`${dateStr}T${timeStr || '00:00'}`)
  const parts: string[] = [d.toLocaleDateString('en', { month: 'short', day: 'numeric' })]
  if (timeStr) parts.push(d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' }))
  return parts.join(', ')
}

function pillClass(active: boolean) {
  return [
    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
    'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
    active
      ? 'border-primary/40 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/10'
      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600',
  ].join(' ')
}

const dropdownContent =
  'z-50 min-w-[150px] rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 focus:outline-none'
const dropdownItem =
  'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:bg-gray-700'

export function CreateTaskModal({
  projectId,
  projectName,
  defaultStatus = 'TODO',
  open,
  onClose,
}: CreateTaskModalProps) {
  const { data: allProjects = [] } = useProjects()

  // Selected project — seeded from prop if provided
  const [selProjectId, setSelProjectId] = useState(projectId ?? '')
  const [selProjectName, setSelProjectName] = useState(projectName ?? '')

  const createTask = useCreateTask(selProjectId)

  const smartRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [smartText, setSmartText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [dateValue, setDateValue] = useState('')
  const [timeValue, setTimeValue] = useState('')

  // @ mention state
  const [mentionActive, setMentionActive] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', status: defaultStatus, priority: 'MEDIUM', dueDate: '' },
  })

  // Reset when modal opens — focus goes to the AI field
  useEffect(() => {
    if (open) {
      setSmartText('')
      setDateValue('')
      setTimeValue('')
      setMentionActive(false)
      setMentionQuery('')
      setSelProjectId(projectId ?? '')
      setSelProjectName(projectName ?? '')
      reset({ title: '', description: '', status: defaultStatus, priority: 'MEDIUM', dueDate: '' })
      setTimeout(() => smartRef.current?.focus(), 50)
    }
  }, [open, defaultStatus, projectId, projectName, reset])

  // Sync date + time into form field
  useEffect(() => {
    if (dateValue) {
      const dt = new Date(`${dateValue}T${timeValue || '00:00'}`)
      setValue('dueDate', dt.toISOString())
    } else {
      setValue('dueDate', '')
    }
  }, [dateValue, timeValue, setValue])

  const applyParsed = useCallback(
    (result: ParsedTask, text: string) => {
      setValue('title', result.title || text)
      if (result.priority) setValue('priority', result.priority)
      if (result.dueDate) {
        const d = new Date(result.dueDate)
        setDateValue(d.toISOString().slice(0, 10))
      }
      if (result.description) setValue('description', result.description)
    },
    [setValue],
  )

  const parse = useCallback(
    async (text: string) => {
      if (text.trim().length < 4) { setValue('title', text); return }
      setParsing(true)
      try {
        const result = await apiClient.post<ParsedTask>('/tasks/parse', { text })
        applyParsed(result, text)
      } catch {
        setValue('title', text)
      } finally {
        setParsing(false)
      }
    },
    [setValue, applyParsed],
  )

  // Filtered project list for @ mention
  const mentionMatches = allProjects.filter((p) =>
    !mentionQuery || p.name.toLowerCase().includes(mentionQuery.toLowerCase()),
  )

  function pickProject(project: Project) {
    // Remove the @mention token from the smart text
    const cleaned = smartText.replace(/@\S*$/, '').replace(/@\S+\s?/, '').trim()
    setSmartText(cleaned)
    setSelProjectId(project.id)
    setSelProjectName(project.name)
    setMentionActive(false)
    setMentionQuery('')
    setMentionIndex(0)
    smartRef.current?.focus()
  }

  function onSmartChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value
    setSmartText(text)

    // Detect @mention at cursor position
    const cursor = e.target.selectionStart ?? text.length
    const before = text.slice(0, cursor)
    const mentionMatch = before.match(/@(\w*)$/)
    if (mentionMatch) {
      setMentionActive(true)
      setMentionQuery(mentionMatch[1])
      setMentionIndex(0)
    } else {
      setMentionActive(false)
      setMentionQuery('')
    }

    // Strip @mentions before sending to AI
    const cleanText = text.replace(/@\S+/g, '').trim()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (cleanText.length >= 4) {
      debounceRef.current = setTimeout(() => void parse(cleanText), 700)
    }
  }

  function onSmartKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionActive && mentionMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex((i) => (i + 1) % mentionMatches.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex((i) => (i - 1 + mentionMatches.length) % mentionMatches.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const p = mentionMatches[mentionIndex]
        if (p) pickProject(p)
        return
      }
      if (e.key === 'Escape') {
        setMentionActive(false)
        return
      }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      void handleSubmit(onSubmit)()
    }
  }

  async function onSubmit(values: FormValues) {
    if (!selProjectId) {
      toast.error('Type @project to select a project')
      smartRef.current?.focus()
      return
    }
    try {
      await createTask.mutateAsync({
        title: values.title,
        description: values.description || undefined,
        status: values.status,
        priority: values.priority,
        dueDate: values.dueDate || undefined,
      })
      toast.success('Task created')
      onClose()
    } catch {
      // error already toasted by mutation
    }
  }

  const statusValue = watch('status')
  const priorityValue = watch('priority')
  const titleValue = watch('title')

  const statusLabel = STATUS_OPTIONS.find((s) => s.value === statusValue)?.label ?? 'Status'
  const priorityLabel = PRIORITY_OPTIONS.find((p) => p.value === priorityValue)?.label ?? 'Priority'
  const dateLabel = dateValue ? formatDate(dateValue, timeValue) : ''

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
        className="flex flex-col"
      >
        {/* AI smart input with @ mention */}
        <div className="relative px-5 pt-5 pb-3">
          <div className="relative">
            <textarea
              ref={smartRef}
              value={smartText}
              onChange={onSmartChange}
              onKeyDown={onSmartKeyDown}
              placeholder="Describe your task… or type @ to pick a project"
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 pr-8 text-sm text-gray-700 placeholder-gray-400 outline-none transition-colors focus:border-primary/50 focus:bg-white focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:bg-gray-800"
            />
            <Sparkles
              className={`absolute right-2.5 top-2.5 h-3.5 w-3.5 transition-colors ${
                parsing ? 'animate-pulse text-primary' : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          </div>

          {/* @ mention dropdown */}
          {mentionActive && mentionMatches.length > 0 && (
            <div className="absolute left-5 right-5 top-full z-50 mt-1 rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-1.5 border-b border-gray-100 px-3 py-2 dark:border-gray-700">
                <AtSign className="h-3 w-3 text-gray-400" />
                <span className="text-xs font-medium text-gray-400">Select project</span>
              </div>
              <ul className="max-h-48 overflow-y-auto p-1">
                {mentionMatches.map((project, i) => (
                  <li key={project.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault() // keep textarea focused
                        pickProject(project)
                      }}
                      className={[
                        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-left',
                        i === mentionIndex
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
                      ].join(' ')}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: (project as Project & { color?: string }).color ?? '#8337c8' }}
                      />
                      {project.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mx-5 border-t border-gray-100 dark:border-gray-800" />

        {/* Task name */}
        <div className="px-5 pt-4">
          <input
            type="text"
            placeholder="Task name"
            autoComplete="off"
            {...register('title')}
            className="w-full bg-transparent text-[1.05rem] font-semibold text-gray-900 placeholder-gray-300 outline-none dark:text-gray-100 dark:placeholder-gray-600"
          />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
        </div>

        {/* Description */}
        <div className="px-5 pt-2 pb-3">
          <textarea
            placeholder="Description"
            rows={2}
            className="w-full resize-none bg-transparent text-sm text-gray-500 placeholder-gray-300 outline-none dark:text-gray-400 dark:placeholder-gray-600"
            {...register('description')}
          />
        </div>

        <div className="mx-5 border-t border-gray-100 dark:border-gray-800" />

        {/* Pill toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-3">

          {/* Date + Time */}
          <Popover.Root>
            <Popover.Trigger asChild>
              <button type="button" className={pillClass(!!dateValue)}>
                <CalendarDays className="h-3.5 w-3.5" />
                <span>{dateLabel || 'Date'}</span>
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                side="bottom"
                align="start"
                sideOffset={6}
                className="z-50 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800 focus:outline-none"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Date</label>
                    <input
                      type="date"
                      value={dateValue}
                      onChange={(e) => setDateValue(e.target.value)}
                      className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Time{' '}
                      <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="time"
                      value={timeValue}
                      onChange={(e) => setTimeValue(e.target.value)}
                      className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                    />
                  </div>
                  {dateValue && (
                    <button
                      type="button"
                      onClick={() => { setDateValue(''); setTimeValue('') }}
                      className="text-left text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      Clear date
                    </button>
                  )}
                </div>
                <Popover.Arrow className="fill-white dark:fill-gray-800" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          {/* Priority */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button type="button" className={pillClass(priorityValue !== 'MEDIUM')}>
                <Flag className={`h-3.5 w-3.5 ${PRIORITY_COLOR[priorityValue]}`} />
                <span>{priorityLabel}</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content side="bottom" align="start" sideOffset={6} className={dropdownContent}>
                {PRIORITY_OPTIONS.map((p) => (
                  <DropdownMenu.Item
                    key={p.value}
                    className={dropdownItem}
                    onSelect={() => setValue('priority', p.value)}
                  >
                    <Flag className={`h-3.5 w-3.5 ${p.color}`} />
                    {p.label}
                    {priorityValue === p.value && <span className="ml-auto text-primary">✓</span>}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* Status */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button type="button" className={pillClass(statusValue !== 'TODO')}>
                <LayoutList className="h-3.5 w-3.5" />
                <span>{statusLabel}</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content side="bottom" align="start" sideOffset={6} className={dropdownContent}>
                {STATUS_OPTIONS.map((s) => (
                  <DropdownMenu.Item
                    key={s.value}
                    className={dropdownItem}
                    onSelect={() => setValue('status', s.value)}
                  >
                    {s.label}
                    {statusValue === s.value && <span className="ml-auto text-primary">✓</span>}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

        </div>

        <div className="mx-5 border-t border-gray-100 dark:border-gray-800" />

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4">
          {/* Project badge — shows selected project or prompts with @ hint */}
          <div className="flex items-center gap-1.5">
            <Folder className="h-3.5 w-3.5 text-gray-400" />
            {selProjectName ? (
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {selProjectName}
              </span>
            ) : (
              <span className="text-sm text-gray-400 dark:text-gray-500">
                Type <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs dark:bg-gray-700">@project</kbd> to assign
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-gray-400 dark:text-gray-500 sm:block">
              <kbd className="font-mono">⌘↵</kbd> to create
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={isSubmitting}
              disabled={!titleValue.trim() || !selProjectId}
            >
              Add task
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

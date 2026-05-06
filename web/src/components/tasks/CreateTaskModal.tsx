// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useEffect, useState, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useCreateTask } from '../../hooks/useTasks'
import { apiClient } from '../../lib/api-client'
import type { TaskStatus } from '../../types'

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 chars or fewer'),
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

const statusOptions = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
]

const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
]

const priorityColor: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

interface CreateTaskModalProps {
  projectId: string
  defaultStatus?: TaskStatus
  open: boolean
  onClose: () => void
}

export function CreateTaskModal({
  projectId,
  defaultStatus = 'TODO',
  open,
  onClose,
}: CreateTaskModalProps) {
  const createTask = useCreateTask(projectId)
  const [smartText, setSmartText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [detected, setDetected] = useState<{ dueDate?: string; priority?: string }>({})
  const smartInputRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  useEffect(() => {
    if (open) {
      setSmartText('')
      setDetected({})
      reset({ title: '', description: '', status: defaultStatus, priority: 'MEDIUM', dueDate: '' })
      setTimeout(() => smartInputRef.current?.focus(), 50)
    }
  }, [open, defaultStatus, reset])

  const applyParsed = useCallback((result: ParsedTask, text: string) => {
    setValue('title', result.title || text)
    if (result.priority) setValue('priority', result.priority)
    if (result.dueDate) setValue('dueDate', result.dueDate)
    if (result.description) setValue('description', result.description)
    setDetected({
      dueDate: result.dueDate ?? undefined,
      priority: result.priority ?? undefined,
    })
  }, [setValue])

  const parse = useCallback(async (text: string) => {
    if (text.trim().length < 4) {
      setValue('title', text)
      setDetected({})
      return
    }
    setParsing(true)
    try {
      const result = await apiClient.post<ParsedTask>('/tasks/parse', { text })
      applyParsed(result, text)
    } catch {
      setValue('title', text)
    } finally {
      setParsing(false)
    }
  }, [setValue, applyParsed])

  function onSmartChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value
    setSmartText(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!text.trim()) {
      setValue('title', '')
      setDetected({})
      return
    }
    debounceRef.current = setTimeout(() => void parse(text), 700)
  }

  async function onSubmit(values: FormValues) {
    try {
      // Convert YYYY-MM-DD to ISO datetime for the backend
      const dueDate = values.dueDate
        ? new Date(values.dueDate + 'T00:00:00.000Z').toISOString()
        : undefined
      await createTask.mutateAsync({
        title: values.title,
        description: values.description || undefined,
        status: values.status,
        priority: values.priority,
        dueDate,
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

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="New Task">
      <div className="flex flex-col gap-5">

        {/* Smart input */}
        <div className="relative">
          <textarea
            ref={smartInputRef}
            value={smartText}
            onChange={onSmartChange}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                void handleSubmit(onSubmit)()
              }
            }}
            placeholder="Describe your task… e.g. Fix login bug by Friday, high priority"
            rows={2}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-8 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:bg-gray-800"
          />
          <Sparkles className={`absolute right-3 top-3 h-4 w-4 transition-colors ${parsing ? 'animate-pulse text-primary' : 'text-gray-300 dark:text-gray-600'}`} />

          {/* Detected chips */}
          {(detected.dueDate || detected.priority) && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {detected.priority && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor[detected.priority]}`}>
                  {detected.priority.toLowerCase()} priority
                </span>
              )}
              {detected.dueDate && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  due {new Date(detected.dueDate + 'T12:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

          {/* Title — pre-filled by AI, user can edit */}
          <Input
            label="Title"
            placeholder={smartText ? 'Parsing…' : 'Task title'}
            error={errors.title?.message}
            {...register('title')}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
              rows={2}
              placeholder="Optional…"
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Status"
              value={statusValue}
              onValueChange={(v) => setValue('status', v as TaskStatus)}
              options={statusOptions}
              error={errors.status?.message}
            />
            <Select
              label="Priority"
              value={priorityValue}
              onValueChange={(v) => setValue('priority', v as 'LOW' | 'MEDIUM' | 'HIGH')}
              options={priorityOptions}
              error={errors.priority?.message}
            />
          </div>

          <Input
            label="Due date"
            type="date"
            error={errors.dueDate?.message}
            {...register('dueDate')}
          />

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {parsing ? 'AI is reading…' : titleValue ? '⌘↵ to create' : 'Type above — AI fills the form · ⌘↵ to create'}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Create task</Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  )
}

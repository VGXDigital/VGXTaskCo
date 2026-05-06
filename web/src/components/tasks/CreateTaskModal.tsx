// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useCreateTask } from '../../hooks/useTasks'
import type { TaskStatus } from '../../types'

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 chars or fewer'),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  dueDate: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

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

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      status: defaultStatus,
      priority: 'MEDIUM',
      dueDate: '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        title: '',
        description: '',
        status: defaultStatus,
        priority: 'MEDIUM',
        dueDate: '',
      })
    }
  }, [open, defaultStatus, reset])

  async function onSubmit(values: FormValues) {
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

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="New Task">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Title"
          placeholder="Task title"
          error={errors.title?.message}
          {...register('title')}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            rows={3}
            placeholder="Optional description…"
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

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Create task
          </Button>
        </div>
      </form>
    </Modal>
  )
}

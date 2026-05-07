// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { format, isPast, parseISO } from 'date-fns'
import { Badge } from '../ui/Badge'
import type { Priority, Task, TaskStatus } from '../../types'

interface TaskCardProps {
  task: Task
  onClick: () => void
}

const statusDotColor: Record<TaskStatus, string> = {
  TODO: 'bg-gray-400',
  IN_PROGRESS: 'bg-blue-500',
  DONE: 'bg-emerald-500',
}

const priorityVariant: Record<Priority, 'low' | 'medium' | 'high'> = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'DONE') return false
  return isPast(parseISO(task.dueDate))
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const overdue = isOverdue(task)

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="cursor-pointer rounded-lg bg-white p-3.5 shadow-sm ring-1 ring-gray-200 hover:shadow-md dark:bg-gray-800 dark:ring-gray-700 dark:hover:shadow-gray-900"
    >
      {/* Header row */}
      <div className="mb-2 flex items-start gap-2">
        <span
          className={['mt-1.5 h-2 w-2 flex-shrink-0 rounded-full', statusDotColor[task.status]].join(' ')}
        />
        <p className="flex-1 text-sm font-medium leading-snug text-gray-900 dark:text-gray-100 line-clamp-2">
          {task.title}
        </p>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={priorityVariant[task.priority]} />

        {task.dueDate && (
          <span
            className={[
              'flex items-center gap-0.5 text-xs',
              overdue
                ? 'font-semibold text-red-600 dark:text-red-400'
                : 'text-gray-500 dark:text-gray-400',
            ].join(' ')}
          >
            {overdue && <AlertCircle className="h-3 w-3" />}
            {format(parseISO(task.dueDate), 'MMM d')}
          </span>
        )}
      </div>
    </motion.div>
  )
}

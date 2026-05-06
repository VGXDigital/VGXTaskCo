// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Popover from '@radix-ui/react-popover'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { Archive, ArchiveRestore, Send, Tag, Trash2, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'
import { useUpdateTask, useDeleteTask } from '../../hooks/useTasks'
import { useTags, useAttachTags } from '../../hooks/useTags'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { Modal } from '../ui/Modal'
import type { Comment, Priority, Task, TaskStatus } from '../../types'

interface TaskDetailModalProps {
  taskId: string
  open: boolean
  onClose: () => void
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

const priorityVariant: Record<Priority, 'low' | 'medium' | 'high'> = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
}

function useTask(id: string) {
  return useQuery<Task>({
    queryKey: ['task', id],
    queryFn: () => apiClient.get<Task>(`/tasks/${id}`),
    enabled: Boolean(id),
  })
}

function useTaskComments(taskId: string) {
  return useQuery<Comment[]>({
    queryKey: ['task-comments', taskId],
    queryFn: () => apiClient.get<Comment[]>(`/tasks/${taskId}/comments`),
    enabled: Boolean(taskId),
  })
}

function useAddComment(taskId: string) {
  const qc = useQueryClient()
  return useMutation<unknown, Error, { body: string }>({
    mutationFn: (body) => apiClient.post<unknown>(`/tasks/${taskId}/comments`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['task-comments', taskId] })
    },
    onError: (err) => toast.error(err.message),
  })
}

function useArchiveTask() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, { id: string; archive: boolean }>({
    mutationFn: ({ id, archive }) =>
      apiClient.patch<unknown>(`/tasks/${id}`, { archivedAt: archive ? new Date().toISOString() : null }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['task', variables.id] })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (err) => toast.error(err.message),
  })
}

interface InlineTitleProps {
  value: string
  onSave: (v: string) => void
}

function InlineTitle({ value, onSave }: InlineTitleProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  function commit() {
    if (draft.trim() && draft.trim() !== value) {
      onSave(draft.trim())
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        className="w-full rounded border border-primary bg-white px-2 py-1 text-lg font-semibold text-gray-900 outline-none dark:bg-gray-800 dark:text-gray-100"
      />
    )
  }

  return (
    <h2
      className="cursor-text text-lg font-semibold text-gray-900 hover:underline decoration-dashed underline-offset-2 dark:text-gray-100"
      onClick={() => setEditing(true)}
    >
      {value}
    </h2>
  )
}

interface TagsPopoverProps {
  taskId: string
  currentTagIds: string[]
}

function TagsPopover({ taskId, currentTagIds }: TagsPopoverProps) {
  const { data: allTags = [] } = useTags()
  const attachTags = useAttachTags(taskId)
  const [selected, setSelected] = useState<Set<string>>(new Set(currentTagIds))
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setSelected(new Set(currentTagIds))
  }, [currentTagIds, open])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function save() {
    try {
      await attachTags.mutateAsync({ tagIds: Array.from(selected) })
      setOpen(false)
    } catch {
      // already toasted
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-500 hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-400">
          <Tag className="h-3 w-3" />
          Add tag
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-[300] w-56 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          sideOffset={4}
        >
          {allTags.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">No tags yet.</p>
          ) : (
            <ul className="mb-3 space-y-1">
              {allTags.map((tag) => (
                <li key={tag.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      checked={selected.has(tag.id)}
                      onChange={() => toggle(tag.id)}
                      className="accent-primary"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{tag.value}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <Button size="sm" className="w-full" onClick={save} loading={attachTags.isPending}>
            Save
          </Button>
          <Popover.Arrow className="fill-white dark:fill-gray-800" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function TaskDetailModal({ taskId, open, onClose }: TaskDetailModalProps) {
  const { data: task, isLoading } = useTask(taskId)
  const { data: comments = [] } = useTaskComments(taskId)
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const archiveTask = useArchiveTask()
  const addComment = useAddComment(taskId)

  const [commentBody, setCommentBody] = useState('')
  const [descDraft, setDescDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (task) setDescDraft(task.description ?? '')
  }, [task])

  function handleUpdate(data: Partial<Task>) {
    if (!task) return
    updateTask.mutate({ id: task.id, data }, {
      onError: (err) => toast.error(err.message),
    })
  }

  function handleDescBlur() {
    if (!task) return
    if (descDraft !== (task.description ?? '')) {
      handleUpdate({ description: descDraft })
    }
  }

  async function handleDelete() {
    if (!task) return
    try {
      await deleteTask.mutateAsync({ id: task.id, projectId: task.projectId })
      toast.success('Task deleted')
      setConfirmDelete(false)
      onClose()
    } catch {
      // already toasted
    }
  }

  async function handleArchive() {
    if (!task) return
    const archive = !task.archivedAt
    try {
      await archiveTask.mutateAsync({ id: task.id, archive })
      toast.success(archive ? 'Task archived' : 'Task restored')
    } catch {
      // already toasted
    }
  }

  async function handleSendComment() {
    if (!commentBody.trim()) return
    try {
      await addComment.mutateAsync({ body: commentBody.trim() })
      setCommentBody('')
    } catch {
      // already toasted
    }
  }

  return (
    <>
      {/* Delete confirm modal */}
      <Modal
        open={confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(false)}
        title="Delete task?"
        description="This action cannot be undone."
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleteTask.isPending}>
            Delete
          </Button>
        </div>
      </Modal>

      {/* Slide-in panel */}
      <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
        <AnimatePresence>
          {open && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div
                  className="fixed inset-0 z-40 bg-black/40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              </Dialog.Overlay>

              <Dialog.Content asChild>
                <motion.div
                  className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-900"
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  {/* Header */}
                  <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                    <Dialog.Title className="sr-only">Task detail</Dialog.Title>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleArchive}
                        loading={archiveTask.isPending}
                        title={task?.archivedAt ? 'Unarchive' : 'Archive'}
                      >
                        {task?.archivedAt ? (
                          <ArchiveRestore className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                        {task?.archivedAt ? 'Unarchive' : 'Archive'}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setConfirmDelete(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                    <Dialog.Close className="rounded p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary dark:hover:text-gray-200">
                      <X className="h-5 w-5" />
                    </Dialog.Close>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto px-5 py-5">
                    {isLoading || !task ? (
                      <div className="flex h-32 items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    ) : (
                      <>
                        {/* Title */}
                        <div className="mb-4">
                          <InlineTitle
                            value={task.title}
                            onSave={(title) => handleUpdate({ title })}
                          />
                        </div>

                        {/* Meta row */}
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                          <Select
                            value={task.status}
                            onValueChange={(v) => handleUpdate({ status: v as TaskStatus })}
                            options={statusOptions}
                            className="w-36"
                          />
                          <Select
                            value={task.priority}
                            onValueChange={(v) => handleUpdate({ priority: v as Priority })}
                            options={priorityOptions}
                            className="w-32"
                          />
                          <Badge variant={priorityVariant[task.priority]} />
                        </div>

                        {/* Due date */}
                        <div className="mb-4 flex flex-col gap-1">
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Due date
                          </label>
                          <input
                            type="date"
                            defaultValue={task.dueDate ? format(parseISO(task.dueDate), 'yyyy-MM-dd') : ''}
                            onBlur={(e) =>
                              handleUpdate({ dueDate: e.target.value || undefined })
                            }
                            className="w-40 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                          />
                        </div>

                        {/* Description */}
                        <div className="mb-5 flex flex-col gap-1">
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Description
                          </label>
                          <textarea
                            value={descDraft}
                            onChange={(e) => setDescDraft(e.target.value)}
                            onBlur={handleDescBlur}
                            rows={4}
                            placeholder="Add a description…"
                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                          />
                        </div>

                        {/* Tags */}
                        <div className="mb-5">
                          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                            Tags
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {(task.tags ?? []).map((tag) => (
                              <span
                                key={tag.id}
                                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary dark:bg-primary/20"
                              >
                                {tag.value}
                              </span>
                            ))}
                            <TagsPopover
                              taskId={task.id}
                              currentTagIds={(task.tags ?? []).map((t) => t.id)}
                            />
                          </div>
                        </div>

                        {/* Comments */}
                        <div>
                          <p className="mb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                            Comments ({comments.length})
                          </p>
                          {comments.length > 0 && (
                            <ul className="mb-4 space-y-3">
                              {comments.map((c) => (
                                <li
                                  key={c.id}
                                  className="rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-800"
                                >
                                  <div className="mb-1 flex items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                      {c.author.name}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {format(parseISO(c.createdAt), 'MMM d, HH:mm')}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-800 dark:text-gray-200">
                                    {c.body}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Add comment */}
                          <div className="flex gap-2">
                            <input
                              value={commentBody}
                              onChange={(e) => setCommentBody(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  void handleSendComment()
                                }
                              }}
                              placeholder="Add a comment…"
                              className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                            />
                            <Button
                              size="sm"
                              onClick={handleSendComment}
                              loading={addComment.isPending}
                              disabled={!commentBody.trim()}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </>
  )
}

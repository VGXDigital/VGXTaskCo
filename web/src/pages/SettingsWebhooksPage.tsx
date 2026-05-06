// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Link, Plus, RefreshCw, Trash2, Zap } from 'lucide-react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { toast } from 'sonner'
import {
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useRotateWebhookSecret,
  useTestWebhook,
} from '../hooks/useWebhooks'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import type { Webhook, WebhookCreated, WebhookEvent } from '../types'

const ALL_EVENTS: WebhookEvent[] = [
  'task.created',
  'task.updated',
  'task.status.changed',
  'task.completed',
  'task.archived',
  'task.deleted',
]

// ---------- Secret reveal ----------

interface SecretRevealProps {
  secret: string
  onDone: () => void
}

function SecretReveal({ secret, onDone }: SecretRevealProps) {
  const [copied, setCopied] = useState(false)
  const [canClose, setCanClose] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => setCanClose(true), 5000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  async function handleCopy() {
    await navigator.clipboard.writeText(secret)
    setCopied(true)
    setCanClose(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        This is the{' '}
        <span className="font-semibold text-red-600 dark:text-red-400">only time</span> you will see
        the signing secret. Use it to verify webhook payloads in your endpoint.
      </p>
      <div className="flex items-center gap-2 rounded-md bg-gray-50 p-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
        <code className="flex-1 break-all font-mono text-xs text-gray-800 dark:text-gray-200 select-all">
          {secret}
        </code>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 rounded p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Copy secret"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex justify-end">
        <Button onClick={onDone} disabled={!canClose}>
          I've copied it
        </Button>
      </div>
    </div>
  )
}

// ---------- Add webhook dialog ----------

interface AddWebhookDialogProps {
  open: boolean
  onClose: () => void
}

function AddWebhookDialog({ open, onClose }: AddWebhookDialogProps) {
  const createWebhook = useCreateWebhook()
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<Set<WebhookEvent>>(new Set())
  const [eventsError, setEventsError] = useState('')
  const [created, setCreated] = useState<WebhookCreated | null>(null)

  function reset() {
    setUrl('')
    setUrlError('')
    setSelectedEvents(new Set())
    setEventsError('')
    setCreated(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function toggleEvent(event: WebhookEvent) {
    setSelectedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(event)) next.delete(event)
      else next.add(event)
      return next
    })
  }

  function validate(): boolean {
    let valid = true
    try {
      new URL(url)
      setUrlError('')
    } catch {
      setUrlError('Must be a valid URL (include https://)')
      valid = false
    }
    if (selectedEvents.size === 0) {
      setEventsError('Select at least one event')
      valid = false
    } else {
      setEventsError('')
    }
    return valid
  }

  async function handleCreate() {
    if (!validate()) return
    try {
      const result = await createWebhook.mutateAsync({
        url,
        events: Array.from(selectedEvents),
      })
      setCreated(result)
    } catch {
      // mutation error already toasted
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && handleClose()}
      title={created ? 'Webhook signing secret' : 'Add webhook'}
    >
      {created ? (
        <SecretReveal secret={created.secret} onDone={handleClose} />
      ) : (
        <div className="flex flex-col gap-4">
          <Input
            label="Endpoint URL"
            placeholder="https://your-server.com/webhook"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            error={urlError}
          />

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Events
              {eventsError && (
                <span className="ml-2 text-xs font-normal text-red-500">{eventsError}</span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_EVENTS.map((event) => (
                <label
                  key={event}
                  className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.has(event)}
                    onChange={() => toggleEvent(event)}
                    className="accent-primary"
                  />
                  <code className="text-xs">{event}</code>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleCreate} loading={createWebhook.isPending}>
              <Link className="h-4 w-4" />
              Add webhook
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ---------- Delete confirm dialog ----------

interface DeleteDialogProps {
  webhookId: string
  open: boolean
  onClose: () => void
}

function DeleteDialog({ webhookId, open, onClose }: DeleteDialogProps) {
  const deleteWebhook = useDeleteWebhook()

  async function handleDelete() {
    try {
      await deleteWebhook.mutateAsync(webhookId)
      toast.success('Webhook deleted')
      onClose()
    } catch {
      // mutation error already toasted
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
          <AlertDialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Delete webhook?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            This endpoint will stop receiving events immediately. This cannot be undone.
          </AlertDialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant="danger" onClick={handleDelete} loading={deleteWebhook.isPending}>
                Delete
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

// ---------- Rotate secret modal ----------

interface RotateSecretModalProps {
  webhookId: string
  open: boolean
  onClose: () => void
}

function RotateSecretModal({ webhookId, open, onClose }: RotateSecretModalProps) {
  const rotateSecret = useRotateWebhookSecret()
  const [rotated, setRotated] = useState<WebhookCreated | null>(null)

  async function handleRotate() {
    try {
      const result = await rotateSecret.mutateAsync(webhookId)
      setRotated(result)
    } catch {
      // mutation error already toasted
    }
  }

  function handleClose() {
    setRotated(null)
    onClose()
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && handleClose()}
      title={rotated ? 'New signing secret' : 'Rotate signing secret'}
    >
      {rotated ? (
        <SecretReveal secret={rotated.secret} onDone={handleClose} />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Rotating the secret invalidates the current one immediately. Update your endpoint to use
            the new secret before rotating.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleRotate} loading={rotateSecret.isPending}>
              <RefreshCw className="h-4 w-4" />
              Rotate secret
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ---------- Webhook card ----------

function WebhookCard({ webhook }: { webhook: Webhook }) {
  const updateWebhook = useUpdateWebhook()
  const testWebhook = useTestWebhook()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [rotateOpen, setRotateOpen] = useState(false)

  async function handleToggleActive() {
    await updateWebhook.mutateAsync({ id: webhook.id, data: { active: !webhook.active } })
  }

  async function handleTest() {
    try {
      toast.info('Sending test event…')
      await testWebhook.mutateAsync(webhook.id)
      toast.success('Test event dispatched')
    } catch {
      // mutation error already toasted
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-white p-4 ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
      {/* URL + active toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link className="h-4 w-4 flex-shrink-0 text-gray-400" />
          <span
            className="truncate text-sm font-medium text-gray-800 dark:text-gray-200"
            title={webhook.url}
          >
            {webhook.url}
          </span>
        </div>
        <label className="flex flex-shrink-0 cursor-pointer items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{webhook.active ? 'Active' : 'Inactive'}</span>
          <button
            role="switch"
            aria-checked={webhook.active}
            onClick={handleToggleActive}
            disabled={updateWebhook.isPending}
            className={[
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              webhook.active
                ? 'bg-primary'
                : 'bg-gray-300 dark:bg-gray-600',
              'disabled:opacity-50',
            ].join(' ')}
          >
            <span
              className={[
                'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                webhook.active ? 'translate-x-4' : 'translate-x-1',
              ].join(' ')}
            />
          </button>
        </label>
      </div>

      {/* Events chips */}
      <div className="flex flex-wrap gap-1.5">
        {webhook.events.map((event) => (
          <span
            key={event}
            className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary dark:bg-primary/20 dark:text-primary-300"
          >
            {event}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleTest}
          loading={testWebhook.isPending}
        >
          <Zap className="h-3.5 w-3.5" />
          Test
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setRotateOpen(true)}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Rotate secret
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="danger"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      <DeleteDialog webhookId={webhook.id} open={deleteOpen} onClose={() => setDeleteOpen(false)} />
      <RotateSecretModal webhookId={webhook.id} open={rotateOpen} onClose={() => setRotateOpen(false)} />
    </div>
  )
}

// ---------- Page ----------

export function SettingsWebhooksPage() {
  const { data: webhooks = [], isLoading } = useWebhooks()
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Webhooks</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Push task events to any HTTP endpoint or n8n flow.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add webhook
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
          <Link className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No webhooks configured. Connect n8n or any HTTP endpoint to task events.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {webhooks.map((webhook) => (
            <WebhookCard key={webhook.id} webhook={webhook} />
          ))}
        </div>
      )}

      <AddWebhookDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

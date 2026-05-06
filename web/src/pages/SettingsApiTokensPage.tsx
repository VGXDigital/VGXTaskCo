// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Key, Plus } from 'lucide-react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { toast } from 'sonner'
import { useApiTokens, useCreateApiToken, useRevokeApiToken } from '../hooks/useApiTokens'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import type { ApiTokenCreated } from '../types'

type Scope = 'user' | 'service'
type ExpiryOption = 'never' | '30' | '90' | '365'

function tokenStatus(revokedAt?: string, expiresAt?: string): 'active' | 'revoked' | 'expired' {
  if (revokedAt) return 'revoked'
  if (expiresAt && new Date(expiresAt) < new Date()) return 'expired'
  return 'active'
}

function StatusBadge({ status }: { status: 'active' | 'revoked' | 'expired' }) {
  const styles = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    revoked: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
    expired: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

interface TokenRevealProps {
  token: ApiTokenCreated
  onDone: () => void
}

function TokenReveal({ token, onDone }: TokenRevealProps) {
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
    await navigator.clipboard.writeText(token.token)
    setCopied(true)
    setCanClose(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Your new token has been created. This is the{' '}
        <span className="font-semibold text-red-600 dark:text-red-400">only time</span> you will see
        it. Store it securely — it cannot be recovered.
      </p>
      <div className="flex items-center gap-2 rounded-md bg-gray-50 p-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
        <code className="flex-1 break-all font-mono text-xs text-gray-800 dark:text-gray-200 select-all">
          {token.token}
        </code>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 rounded p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Copy token"
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

interface GenerateDialogProps {
  open: boolean
  onClose: () => void
}

function GenerateDialog({ open, onClose }: GenerateDialogProps) {
  const createToken = useCreateApiToken()
  const [name, setName] = useState('')
  const [scope, setScope] = useState<Scope>('user')
  const [expiry, setExpiry] = useState<ExpiryOption>('never')
  const [created, setCreated] = useState<ApiTokenCreated | null>(null)
  const [nameError, setNameError] = useState('')

  function reset() {
    setName('')
    setScope('user')
    setExpiry('never')
    setCreated(null)
    setNameError('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleGenerate() {
    if (!name.trim()) {
      setNameError('Name is required')
      return
    }
    setNameError('')
    try {
      const result = await createToken.mutateAsync({
        name: name.trim(),
        scope,
        expiresInDays: expiry === 'never' ? undefined : parseInt(expiry, 10),
      })
      setCreated(result)
    } catch {
      // mutation error already toasted
    }
  }

  return (
    <Modal open={open} onOpenChange={(o: boolean) => !o && handleClose()} title={created ? 'Token created' : 'Generate new token'}>
      {created ? (
        <TokenReveal token={created} onDone={handleClose} />
      ) : (
        <div className="flex flex-col gap-4">
          <Input
            label="Name"
            placeholder="e.g. n8n automation, CI pipeline"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={nameError}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Scope</label>
            <div className="flex gap-4">
              {(['user', 'service'] as Scope[]).map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="scope"
                    value={s}
                    checked={scope === s}
                    onChange={() => setScope(s)}
                    className="accent-primary"
                  />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                  {s === 'service' && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">(for n8n flows)</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Expiry</label>
            <select
              value={expiry}
              onChange={(e) => setExpiry(e.target.value as ExpiryOption)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="never">Never</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleGenerate} loading={createToken.isPending}>
              <Key className="h-4 w-4" />
              Generate
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

interface RevokeDialogProps {
  tokenId: string
  tokenName: string
  open: boolean
  onClose: () => void
}

function RevokeDialog({ tokenId, tokenName, open, onClose }: RevokeDialogProps) {
  const revokeToken = useRevokeApiToken()

  async function handleRevoke() {
    try {
      await revokeToken.mutateAsync(tokenId)
      toast.success('Token revoked')
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
            Revoke token?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Revoking <span className="font-medium">{tokenName}</span> is immediate and permanent. Any
            integration using it will stop working.
          </AlertDialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant="danger" onClick={handleRevoke} loading={revokeToken.isPending}>
                Revoke
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

export function SettingsApiTokensPage() {
  const { data: tokens = [], isLoading } = useApiTokens()
  const [generateOpen, setGenerateOpen] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null)

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">API Tokens</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage personal access tokens for scripts and automation.
          </p>
        </div>
        <Button onClick={() => setGenerateOpen(true)}>
          <Plus className="h-4 w-4" />
          Generate new token
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : tokens.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
          <Key className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No tokens yet. Generate one for n8n flows or scripts.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg ring-1 ring-gray-200 dark:ring-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['Name', 'Prefix', 'Scope', 'Last used', 'Expires', 'Status', ''].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
              {tokens.map((token) => {
                const status = tokenStatus(token.revokedAt, token.expiresAt)
                return (
                  <tr key={token.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {token.name}
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {token.prefix}...
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {token.scope}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {token.lastUsedAt
                        ? new Date(token.lastUsedAt).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {token.expiresAt
                        ? new Date(token.expiresAt).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={status !== 'active'}
                        onClick={() => setRevokeTarget({ id: token.id, name: token.name })}
                      >
                        Revoke
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <GenerateDialog open={generateOpen} onClose={() => setGenerateOpen(false)} />

      {revokeTarget && (
        <RevokeDialog
          tokenId={revokeTarget.id}
          tokenName={revokeTarget.name}
          open={true}
          onClose={() => setRevokeTarget(null)}
        />
      )}
    </div>
  )
}

// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApiToken, ApiTokenCreated } from '../types'

// ── Mock apiClient ────────────────────────────────────────────────────────────

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
  return { Wrapper, client }
}

const sampleTokens: ApiToken[] = [
  {
    id: 'token-1',
    name: 'CI bot',
    prefix: 'vgx_',
    scope: 'service',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'token-2',
    name: 'My CLI',
    prefix: 'vgx_',
    scope: 'user',
    createdAt: '2026-02-01T00:00:00Z',
  },
]

const createdToken: ApiTokenCreated = {
  ...sampleTokens[0],
  token: 'vgx_supersecretrawtoken',
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

// ── useApiTokens ──────────────────────────────────────────────────────────────

describe('useApiTokens — fetches GET /api-tokens', () => {
  it('calls apiClient.get with /api-tokens and returns the token list', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue(sampleTokens)

    const { useApiTokens } = await import('./useApiTokens')
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useApiTokens(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith('/api-tokens')
    expect(result.current.data).toEqual(sampleTokens)
  })

  it('returns an empty array when no tokens exist', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue([])

    const { useApiTokens } = await import('./useApiTokens')
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useApiTokens(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('surfaces an error when the request fails', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Unauthorized'))

    const { useApiTokens } = await import('./useApiTokens')
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useApiTokens(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Unauthorized')
  })
})

// ── useCreateApiToken ─────────────────────────────────────────────────────────

describe('useCreateApiToken — POSTs to /api-tokens', () => {
  it('calls apiClient.post with /api-tokens and the correct payload', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue(sampleTokens)
    vi.mocked(apiClient.post).mockResolvedValue(createdToken)

    const { useCreateApiToken, useApiTokens } = await import('./useApiTokens')
    const { Wrapper } = makeWrapper()

    const { result: listResult } = renderHook(() => useApiTokens(), { wrapper: Wrapper })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    const { result } = renderHook(() => useCreateApiToken(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync({ name: 'CI bot', scope: 'service' })
    })

    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith(
      '/api-tokens',
      expect.objectContaining({ name: 'CI bot', scope: 'service' })
    )
  })

  it('passes optional expiresInDays when provided', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue(sampleTokens)
    vi.mocked(apiClient.post).mockResolvedValue(createdToken)

    const { useCreateApiToken, useApiTokens } = await import('./useApiTokens')
    const { Wrapper } = makeWrapper()

    const { result: listResult } = renderHook(() => useApiTokens(), { wrapper: Wrapper })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    const { result } = renderHook(() => useCreateApiToken(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync({ name: 'Short-lived', scope: 'user', expiresInDays: 30 })
    })

    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith(
      '/api-tokens',
      expect.objectContaining({ expiresInDays: 30 })
    )
  })

  it('returns the created token object including the raw token string', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue(sampleTokens)
    vi.mocked(apiClient.post).mockResolvedValue(createdToken)

    const { useCreateApiToken, useApiTokens } = await import('./useApiTokens')
    const { Wrapper } = makeWrapper()

    const { result: listResult } = renderHook(() => useApiTokens(), { wrapper: Wrapper })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    const { result } = renderHook(() => useCreateApiToken(), { wrapper: Wrapper })
    let returnValue: ApiTokenCreated | undefined
    await act(async () => {
      returnValue = await result.current.mutateAsync({ name: 'CI bot', scope: 'service' })
    })

    expect(returnValue?.token).toBe('vgx_supersecretrawtoken')
  })

  it('invalidates the api-tokens query cache on success', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue(sampleTokens)
    vi.mocked(apiClient.post).mockResolvedValue(createdToken)

    const { useCreateApiToken, useApiTokens } = await import('./useApiTokens')
    const { Wrapper } = makeWrapper()

    const { result: listResult } = renderHook(() => useApiTokens(), { wrapper: Wrapper })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    const getCallsBefore = vi.mocked(apiClient.get).mock.calls.length
    const { result } = renderHook(() => useCreateApiToken(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync({ name: 'CI bot', scope: 'service' })
    })

    await waitFor(() => {
      expect(vi.mocked(apiClient.get).mock.calls.length).toBeGreaterThan(getCallsBefore)
    })
  })
})

// ── useRevokeApiToken ─────────────────────────────────────────────────────────

describe('useRevokeApiToken — DELETEs /api-tokens/:id', () => {
  it('calls apiClient.delete with the correct URL', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue(sampleTokens)
    vi.mocked(apiClient.delete).mockResolvedValue(undefined)

    const { useRevokeApiToken, useApiTokens } = await import('./useApiTokens')
    const { Wrapper } = makeWrapper()

    const { result: listResult } = renderHook(() => useApiTokens(), { wrapper: Wrapper })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    const { result } = renderHook(() => useRevokeApiToken(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync('token-1')
    })

    expect(vi.mocked(apiClient.delete)).toHaveBeenCalledWith('/api-tokens/token-1')
  })

  it('invalidates the api-tokens query cache after revocation', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue(sampleTokens)
    vi.mocked(apiClient.delete).mockResolvedValue(undefined)

    const { useRevokeApiToken, useApiTokens } = await import('./useApiTokens')
    const { Wrapper } = makeWrapper()

    const { result: listResult } = renderHook(() => useApiTokens(), { wrapper: Wrapper })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    const getCallsBefore = vi.mocked(apiClient.get).mock.calls.length
    const { result } = renderHook(() => useRevokeApiToken(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync('token-2')
    })

    await waitFor(() => {
      expect(vi.mocked(apiClient.get).mock.calls.length).toBeGreaterThan(getCallsBefore)
    })
  })

  it('surface an error when revocation fails', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue(sampleTokens)
    vi.mocked(apiClient.delete).mockRejectedValue(new Error('Not found'))

    const { useRevokeApiToken, useApiTokens } = await import('./useApiTokens')
    const { Wrapper } = makeWrapper()

    const { result: listResult } = renderHook(() => useApiTokens(), { wrapper: Wrapper })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    const { result } = renderHook(() => useRevokeApiToken(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync('token-999').catch(() => null)
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Not found')
  })
})

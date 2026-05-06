// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Tag } from '../types'

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

const sampleTags: Tag[] = [
  { id: 'tag-1', value: 'bug', ownerId: 'user-1' },
  { id: 'tag-2', value: 'feature', ownerId: 'user-1' },
]

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

// ── useTags ───────────────────────────────────────────────────────────────────

describe('useTags — fetches GET /tags', () => {
  it('calls apiClient.get with /tags and returns the tag list', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue(sampleTags)

    const { useTags } = await import('./useTags')
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useTags(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith('/tags')
    expect(result.current.data).toEqual(sampleTags)
  })

  it('returns an empty array when the server returns no tags', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue([])

    const { useTags } = await import('./useTags')
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useTags(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('surfaces an error when the request fails', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Unauthorized'))

    const { useTags } = await import('./useTags')
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useTags(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Unauthorized')
  })
})

// ── useCreateTag ──────────────────────────────────────────────────────────────

describe('useCreateTag — POSTs to /tags', () => {
  it('calls apiClient.post with /tags and the value payload', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue(sampleTags)
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'tag-3', value: 'hotfix', ownerId: 'user-1' } })

    const { useCreateTag, useTags } = await import('./useTags')
    const { Wrapper } = makeWrapper()

    const { result: listResult } = renderHook(() => useTags(), { wrapper: Wrapper })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    const { result } = renderHook(() => useCreateTag(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync({ value: 'hotfix' })
    })

    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith('/tags', { value: 'hotfix' })
  })

  it('invalidates the tags query cache on success', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue(sampleTags)
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'tag-3', value: 'new', ownerId: 'user-1' } })

    const { useCreateTag, useTags } = await import('./useTags')
    const { Wrapper } = makeWrapper()

    const { result: listResult } = renderHook(() => useTags(), { wrapper: Wrapper })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    const getCallsBefore = vi.mocked(apiClient.get).mock.calls.length
    const { result } = renderHook(() => useCreateTag(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync({ value: 'new' })
    })

    await waitFor(() => {
      expect(vi.mocked(apiClient.get).mock.calls.length).toBeGreaterThan(getCallsBefore)
    })
  })
})

// ── useDeleteTag ──────────────────────────────────────────────────────────────

describe('useDeleteTag — DELETEs /tags/:id', () => {
  it('calls apiClient.delete with the correct URL', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue(sampleTags)
    vi.mocked(apiClient.delete).mockResolvedValue(undefined)

    const { useDeleteTag, useTags } = await import('./useTags')
    const { Wrapper } = makeWrapper()

    const { result: listResult } = renderHook(() => useTags(), { wrapper: Wrapper })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    const { result } = renderHook(() => useDeleteTag(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync('tag-1')
    })

    expect(vi.mocked(apiClient.delete)).toHaveBeenCalledWith('/tags/tag-1')
  })

  it('invalidates the tags query cache on successful deletion', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue(sampleTags)
    vi.mocked(apiClient.delete).mockResolvedValue(undefined)

    const { useDeleteTag, useTags } = await import('./useTags')
    const { Wrapper } = makeWrapper()

    const { result: listResult } = renderHook(() => useTags(), { wrapper: Wrapper })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    const getCallsBefore = vi.mocked(apiClient.get).mock.calls.length
    const { result } = renderHook(() => useDeleteTag(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync('tag-2')
    })

    await waitFor(() => {
      expect(vi.mocked(apiClient.get).mock.calls.length).toBeGreaterThan(getCallsBefore)
    })
  })
})

// ── useAttachTags ─────────────────────────────────────────────────────────────

describe('useAttachTags — POSTs tag IDs to /tasks/:taskId/tags', () => {
  it('calls apiClient.post with the correct task-scoped URL and tagIds payload', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.post).mockResolvedValue(undefined)

    const { useAttachTags } = await import('./useTags')
    const { Wrapper } = makeWrapper()

    const { result } = renderHook(() => useAttachTags('task-42'), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync({ tagIds: ['tag-1', 'tag-2'] })
    })

    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith(
      '/tasks/task-42/tags',
      { tagIds: ['tag-1', 'tag-2'] }
    )
  })
})

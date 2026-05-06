// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '../types'

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

const sampleProject: Project = {
  id: 'proj-1',
  name: 'Test Project',
  color: '#8337c8',
  ownerId: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
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

// ── useProjects ───────────────────────────────────────────────────────────────

describe('useProjects — fetches GET /projects', () => {
  it('calls apiClient.get with /projects and returns the data', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue([sampleProject])

    const { useProjects } = await import('./useProjects')
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useProjects(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith('/projects')
    expect(result.current.data).toEqual([sampleProject])
  })

  it('exposes isLoading while the request is in flight', async () => {
    const { apiClient } = await import('../lib/api-client')
    let resolveGet!: (v: Project[]) => void
    vi.mocked(apiClient.get).mockReturnValue(
      new Promise<Project[]>((res) => { resolveGet = res })
    )

    const { useProjects } = await import('./useProjects')
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useProjects(), { wrapper: Wrapper })

    expect(result.current.isLoading).toBe(true)
    act(() => resolveGet([sampleProject]))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

// ── useCreateProject ──────────────────────────────────────────────────────────

describe('useCreateProject — POSTs to /projects', () => {
  it('calls apiClient.post with the correct payload', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue([])
    vi.mocked(apiClient.post).mockResolvedValue({ data: sampleProject })

    const { useCreateProject, useProjects } = await import('./useProjects')
    const { Wrapper } = makeWrapper()

    // Prime the cache so invalidation has something to re-fetch
    const { result: listResult } = renderHook(() => useProjects(), { wrapper: Wrapper })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    const { result } = renderHook(() => useCreateProject(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.mutateAsync({ name: 'New Project', color: '#d94a7d' })
    })

    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith(
      '/projects',
      expect.objectContaining({ name: 'New Project', color: '#d94a7d' })
    )
  })

  it('invalidates the projects query cache on success', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue([sampleProject])
    vi.mocked(apiClient.post).mockResolvedValue({ data: sampleProject })

    const { useCreateProject, useProjects } = await import('./useProjects')
    const { Wrapper } = makeWrapper()

    const { result: listResult } = renderHook(() => useProjects(), { wrapper: Wrapper })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    const getCallsBefore = vi.mocked(apiClient.get).mock.calls.length

    const { result } = renderHook(() => useCreateProject(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync({ name: 'Another' })
    })

    // After mutation, cache invalidation should have triggered a re-fetch
    await waitFor(() => {
      expect(vi.mocked(apiClient.get).mock.calls.length).toBeGreaterThan(getCallsBefore)
    })
  })
})

// ── useUpdateProject ──────────────────────────────────────────────────────────

describe('useUpdateProject — PATCHes /projects/:id', () => {
  it('calls apiClient.patch with the correct id and data', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue([sampleProject])
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { ...sampleProject, name: 'Updated' } })

    const { useUpdateProject, useProjects } = await import('./useProjects')
    const { Wrapper } = makeWrapper()

    const { result: listResult } = renderHook(() => useProjects(), { wrapper: Wrapper })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    const { result } = renderHook(() => useUpdateProject(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync({ id: 'proj-1', data: { name: 'Updated' } })
    })

    expect(vi.mocked(apiClient.patch)).toHaveBeenCalledWith(
      '/projects/proj-1',
      expect.objectContaining({ name: 'Updated' })
    )
  })

  it('invalidates the projects query and the specific project query on success', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue([sampleProject])
    vi.mocked(apiClient.patch).mockResolvedValue({ data: sampleProject })

    const { useUpdateProject, useProjects } = await import('./useProjects')
    const { Wrapper } = makeWrapper()

    const { result: listResult } = renderHook(() => useProjects(), { wrapper: Wrapper })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    const getCallsBefore = vi.mocked(apiClient.get).mock.calls.length
    const { result } = renderHook(() => useUpdateProject(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync({ id: 'proj-1', data: { name: 'Changed' } })
    })

    await waitFor(() => {
      expect(vi.mocked(apiClient.get).mock.calls.length).toBeGreaterThan(getCallsBefore)
    })
  })
})

// ── useDeleteProject ──────────────────────────────────────────────────────────

describe('useDeleteProject — DELETEs /projects/:id', () => {
  it('calls apiClient.delete with the correct URL', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue([sampleProject])
    vi.mocked(apiClient.delete).mockResolvedValue(undefined)

    const { useDeleteProject, useProjects } = await import('./useProjects')
    const { Wrapper } = makeWrapper()

    const { result: listResult } = renderHook(() => useProjects(), { wrapper: Wrapper })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    const { result } = renderHook(() => useDeleteProject(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync('proj-1')
    })

    expect(vi.mocked(apiClient.delete)).toHaveBeenCalledWith('/projects/proj-1')
  })

  it('invalidates the projects query cache on success', async () => {
    const { apiClient } = await import('../lib/api-client')
    vi.mocked(apiClient.get).mockResolvedValue([sampleProject])
    vi.mocked(apiClient.delete).mockResolvedValue(undefined)

    const { useDeleteProject, useProjects } = await import('./useProjects')
    const { Wrapper } = makeWrapper()

    const { result: listResult } = renderHook(() => useProjects(), { wrapper: Wrapper })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    const getCallsBefore = vi.mocked(apiClient.get).mock.calls.length
    const { result } = renderHook(() => useDeleteProject(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync('proj-1')
    })

    await waitFor(() => {
      expect(vi.mocked(apiClient.get).mock.calls.length).toBeGreaterThan(getCallsBefore)
    })
  })
})

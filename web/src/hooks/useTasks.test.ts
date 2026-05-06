// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Task } from '../types'
import { useTasks } from './useTasks'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
  return { Wrapper, client }
}

const sampleTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Sample task',
    status: 'TODO',
    priority: 'MEDIUM',
    projectId: 'proj-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useTasks — guard: empty projectId', () => {
  it('does NOT fire fetch when projectId is an empty string', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { Wrapper } = makeWrapper()

    renderHook(() => useTasks(''), { wrapper: Wrapper })

    // Give React Query a tick to fire if it were going to
    await new Promise((r) => setTimeout(r, 50))
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does NOT fire fetch when projectId is undefined coerced via ?? ""', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { Wrapper } = makeWrapper()

    const projectId: string = ''
    renderHook(() => useTasks(projectId), { wrapper: Wrapper })

    await new Promise((r) => setTimeout(r, 50))
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('useTasks — valid projectId fires the query', () => {
  it('calls fetch and returns the unwrapped task array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ data: sampleTasks }),
      })
    )
    const { Wrapper } = makeWrapper()

    const { result } = renderHook(() => useTasks('proj-1'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledOnce()
    expect(result.current.data).toEqual(sampleTasks)
  })

  it('constructs the correct URL path', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: [] }),
    })
    vi.stubGlobal('fetch', fetchSpy)
    const { Wrapper } = makeWrapper()

    const { result } = renderHook(() => useTasks('proj-42'), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const calledUrl = fetchSpy.mock.calls[0][0] as string
    expect(calledUrl).toContain('/projects/proj-42/tasks')
  })
})

describe('useTasks — enabled: false prevents fetch', () => {
  it('does not fetch when options.enabled is false, even with a valid projectId', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { Wrapper } = makeWrapper()

    renderHook(() => useTasks('proj-1', undefined, { enabled: false }), { wrapper: Wrapper })

    await new Promise((r) => setTimeout(r, 50))
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

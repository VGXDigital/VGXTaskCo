// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetchCSV(csvContent: string, contentDisposition?: string) {
  const headers = new Map<string, string>()
  if (contentDisposition) headers.set('content-disposition', contentDisposition)

  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: {
      get: (key: string) => headers.get(key.toLowerCase()) ?? null,
    },
    blob: vi.fn().mockResolvedValue(new Blob([csvContent], { type: 'text/csv' })),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function mockFetchError(status: number, errorBody?: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: false,
    status,
    headers: { get: () => null },
    json: errorBody !== undefined
      ? vi.fn().mockResolvedValue(errorBody)
      : vi.fn().mockRejectedValue(new SyntaxError('no body')),
    blob: vi.fn(),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// ── DOM stubs ─────────────────────────────────────────────────────────────────

let anchorEl: {
  href: string
  download: string
  click: ReturnType<typeof vi.fn>
}

let createObjectURLMock: ReturnType<typeof vi.fn>
let revokeObjectURLMock: ReturnType<typeof vi.fn>

// Keep a reference to the real URL constructor so we don't break `new URL()`
const RealURL = globalThis.URL

beforeEach(() => {
  localStorage.clear()

  anchorEl = { href: '', download: '', click: vi.fn() }

  createObjectURLMock = vi.fn().mockReturnValue('blob:fake-url')
  revokeObjectURLMock = vi.fn()

  // Patch only the static methods — keep the constructor intact
  RealURL.createObjectURL = createObjectURLMock as unknown as typeof URL.createObjectURL
  RealURL.revokeObjectURL = revokeObjectURLMock as unknown as typeof URL.revokeObjectURL

  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') return anchorEl as unknown as HTMLElement
    // Fall through to real createElement for anything else
    return document.createElement.call(document, tag) as HTMLElement
  })

  Object.defineProperty(window, 'location', {
    writable: true,
    value: { href: '' },
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('downloadCSV — happy path', () => {
  it('calls fetch with the correct path (including BASE_URL prefix)', async () => {
    const fetchMock = mockFetchCSV('id,title\n1,Test')
    const { downloadCSV } = await import('./download-csv')

    await downloadCSV('/projects/proj-1/export/tasks.csv')

    expect(fetchMock).toHaveBeenCalledOnce()
    const calledUrl = fetchMock.mock.calls[0][0] as string
    expect(calledUrl).toContain('/projects/proj-1/export/tasks.csv')
  })

  it('triggers a browser download by clicking a synthetic anchor', async () => {
    mockFetchCSV('id,title\n1,Test')
    const { downloadCSV } = await import('./download-csv')

    await downloadCSV('/projects/proj-1/export/tasks.csv')

    expect(anchorEl.click).toHaveBeenCalledOnce()
  })

  it('sets the download filename from the explicit argument when provided', async () => {
    mockFetchCSV('id,title\n1,Test')
    const { downloadCSV } = await import('./download-csv')

    await downloadCSV('/projects/proj-1/export/tasks.csv', 'my-export.csv')

    expect(anchorEl.download).toBe('my-export.csv')
  })

  it('derives filename from Content-Disposition header when no explicit filename given', async () => {
    mockFetchCSV('id,title\n1,Test', 'attachment; filename="tasks-export.csv"')
    const { downloadCSV } = await import('./download-csv')

    await downloadCSV('/projects/proj-1/export/tasks.csv')

    expect(anchorEl.download).toBe('tasks-export.csv')
  })

  it('falls back to vgxtaskco-export.csv when no filename and no header', async () => {
    mockFetchCSV('id,title\n1,Test')
    const { downloadCSV } = await import('./download-csv')

    await downloadCSV('/projects/proj-1/export/tasks.csv')

    expect(anchorEl.download).toBe('vgxtaskco-export.csv')
  })

  it('creates and revokes an object URL', async () => {
    mockFetchCSV('id,title\n1,Test')
    const { downloadCSV } = await import('./download-csv')

    await downloadCSV('/projects/proj-1/export/tasks.csv')

    expect(createObjectURLMock).toHaveBeenCalledOnce()
    expect(revokeObjectURLMock).toHaveBeenCalledOnce()
  })

  it('sends Bearer token when one is stored', async () => {
    const fetchMock = mockFetchCSV('id,title\n1,Test')
    const { setToken } = await import('./auth')
    setToken('my-jwt')
    const { downloadCSV } = await import('./download-csv')

    await downloadCSV('/projects/proj-1/export/tasks.csv')

    const callArgs = fetchMock.mock.calls[0]
    const headers = (callArgs[1] as RequestInit).headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer my-jwt')
  })

  it('omits Authorization header when no token is stored', async () => {
    const fetchMock = mockFetchCSV('id,title\n1,Test')
    const { clearToken } = await import('./auth')
    clearToken()
    const { downloadCSV } = await import('./download-csv')

    await downloadCSV('/projects/proj-1/export/tasks.csv')

    const callArgs = fetchMock.mock.calls[0]
    const headers = (callArgs[1] as RequestInit).headers as Record<string, string>
    expect(headers['Authorization']).toBeUndefined()
  })
})

describe('downloadCSV — error handling', () => {
  it('throws with server error message when body contains { error }', async () => {
    mockFetchError(403, { error: 'Not allowed' })
    const { downloadCSV } = await import('./download-csv')

    await expect(downloadCSV('/projects/proj-1/export/tasks.csv')).rejects.toThrow('Not allowed')
  })

  it('throws with fallback message when error body is unparseable', async () => {
    mockFetchError(500)
    const { downloadCSV } = await import('./download-csv')

    await expect(downloadCSV('/projects/proj-1/export/tasks.csv')).rejects.toThrow('Export failed: 500')
  })

  it('does NOT click the anchor on failure', async () => {
    mockFetchError(403, { error: 'Forbidden' })
    const { downloadCSV } = await import('./download-csv')

    await expect(downloadCSV('/projects/proj-1/export/tasks.csv')).rejects.toThrow()
    expect(anchorEl.click).not.toHaveBeenCalled()
  })
})

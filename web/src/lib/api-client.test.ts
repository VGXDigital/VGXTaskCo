// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetchOk(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(body),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function mockFetchFail(status: number, body?: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: body !== undefined
      ? vi.fn().mockResolvedValue(body)
      : vi.fn().mockRejectedValue(new SyntaxError('no body')),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear()
  // Stub window.location.href assignment so the 401 redirect doesn't throw in jsdom
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

describe('apiClient.get — envelope unwrapping', () => {
  it('unwraps { data: T } and resolves with T directly', async () => {
    mockFetchOk({ data: { id: '1', name: 'Test' } })
    const { apiClient } = await import('./api-client')
    const result = await apiClient.get<{ id: string; name: string }>('/test')
    expect(result).toEqual({ id: '1', name: 'Test' })
    // Confirm we did NOT get the envelope back
    expect((result as unknown as { data?: unknown }).data).toBeUndefined()
  })
})

describe('apiClient.post — envelope unwrapping (login shape)', () => {
  it('resolves with unwrapped token, not data.token', async () => {
    mockFetchOk({
      data: {
        token: 'jwt-abc',
        user: { id: '1', email: 'a@b.com', name: 'A' },
      },
    })
    const { apiClient } = await import('./api-client')
    const result = await apiClient.post<{ token: string; user: { id: string; email: string; name: string } }>(
      '/auth/login',
      { email: 'a@b.com', password: 'pass' }
    )
    expect(result.token).toBe('jwt-abc')
    // The envelope must NOT leak through
    expect((result as unknown as { data?: unknown }).data).toBeUndefined()
  })
})

describe('apiClient — 401 handling', () => {
  it('removes the stored token when the server returns 401', async () => {
    mockFetchFail(401)
    const { apiClient } = await import('./api-client')
    const { setToken, getToken } = await import('./auth')
    setToken('existing-token')

    await expect(apiClient.get('/secure')).rejects.toThrow('Unauthorized')
    // clearToken was invoked — the token must be gone
    expect(getToken()).toBeNull()
  })
})

describe('apiClient — error responses', () => {
  it('throws with the server error message when body contains { error }', async () => {
    mockFetchFail(422, { error: 'Some message' })
    const { apiClient } = await import('./api-client')
    await expect(apiClient.get('/bad')).rejects.toThrow('Some message')
  })

  it('throws with a fallback status message when the error body has no .error field', async () => {
    mockFetchFail(500, {})
    const { apiClient } = await import('./api-client')
    await expect(apiClient.get('/bad')).rejects.toThrow(/Request failed: 500/)
  })

  it('throws even when the response body cannot be parsed as JSON', async () => {
    mockFetchFail(503)
    const { apiClient } = await import('./api-client')
    await expect(apiClient.get('/bad')).rejects.toThrow()
  })
})

describe('apiClient — Authorization header', () => {
  it('sends Bearer token when one is in localStorage', async () => {
    const fetchMock = mockFetchOk({ data: null })
    const { setToken } = await import('./auth')
    setToken('my-token')
    const { apiClient } = await import('./api-client')

    await apiClient.get('/protected').catch(() => null)

    const callArgs = fetchMock.mock.calls[0]
    const headers = (callArgs[1] as RequestInit).headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer my-token')
  })

  it('omits the Authorization header when no token is stored', async () => {
    const fetchMock = mockFetchOk({ data: null })
    const { clearToken } = await import('./auth')
    clearToken()
    const { apiClient } = await import('./api-client')

    await apiClient.get('/public').catch(() => null)

    const callArgs = fetchMock.mock.calls[0]
    const headers = (callArgs[1] as RequestInit).headers as Record<string, string>
    expect(headers['Authorization']).toBeUndefined()
  })
})

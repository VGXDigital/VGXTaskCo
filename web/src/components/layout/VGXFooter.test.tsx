// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VGXFooter } from './VGXFooter'
import { apiClient } from '../../lib/api-client'

// ── Mock apiClient ────────────────────────────────────────────────────────────

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockGet = vi.mocked(apiClient.get)

// ── __APP_VERSION__ is a Vite define — provide a value for the test env ───────

;(globalThis as Record<string, unknown>).__APP_VERSION__ = '0.0.0-test'

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

function renderFooter() {
  const { Wrapper } = makeWrapper()
  return render(React.createElement(Wrapper, null, React.createElement(VGXFooter)))
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('VGXFooter — copyright and branding', () => {
  it('renders the VGX Digital link', () => {
    mockGet.mockResolvedValue({ status: 'ok', service: 'vgxtaskco', version: '1.2.3' })
    renderFooter()
    expect(screen.getByText('VGX Digital')).toBeTruthy()
  })

  it('links to vgx.digital with noopener rel attribute', () => {
    mockGet.mockResolvedValue({ status: 'ok', service: 'vgxtaskco', version: '1.0.0' })
    renderFooter()
    const link = screen.getByRole('link', { name: /vgx digital/i }) as HTMLAnchorElement
    expect(link.href).toContain('vgx.digital')
    expect(link.target).toBe('_blank')
    expect(link.rel).toContain('noopener')
  })
})

describe('VGXFooter — version display from API', () => {
  it('shows the version returned by the health API', async () => {
    mockGet.mockResolvedValue({ status: 'ok', service: 'vgxtaskco', version: '2.5.0' })

    renderFooter()

    await waitFor(() => {
      expect(screen.getByText(/v2\.5\.0/)).toBeTruthy()
    })
  })

  it('shows the build-time __APP_VERSION__ when API returns undefined version', async () => {
    // API returns a response but version field is undefined/missing
    mockGet.mockResolvedValue({ status: 'ok', service: 'vgxtaskco', version: undefined })

    renderFooter()

    await waitFor(() => {
      // Falls back to __APP_VERSION__ which is '0.0.0-test' in this environment
      expect(screen.getByText(/v0\.0\.0-test/)).toBeTruthy()
    })
  })

  it('shows the build-time __APP_VERSION__ when API request fails', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))

    renderFooter()

    // On error the query data is undefined — component falls back to __APP_VERSION__
    await waitFor(() => {
      expect(screen.getByText(/v0\.0\.0-test/)).toBeTruthy()
    })
  })
})

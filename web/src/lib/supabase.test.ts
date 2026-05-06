// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { describe, expect, it } from 'vitest'

// The module uses VITE_SUPABASE_URL from import.meta.env at module load time.
// Rather than trying to override the constant (which is baked in at module eval),
// we test getSSOUrl by inspecting the shape of the URL it produces, which only
// depends on the provider and redirect_to arguments — not the specific base URL.

import { getSSOUrl, SUPABASE_URL } from './supabase'

describe('getSSOUrl — google provider', () => {
  it('returns a URL that starts with SUPABASE_URL + /auth/v1/authorize', () => {
    const url = getSSOUrl('google', 'http://localhost:5173/auth/callback')
    expect(url.startsWith(`${SUPABASE_URL}/auth/v1/authorize`)).toBe(true)
  })

  it('includes provider=google in the query string', () => {
    const url = getSSOUrl('google', 'http://localhost:5173/auth/callback')
    expect(url).toContain('provider=google')
  })

  it('contains /auth/v1/authorize path segment', () => {
    const url = getSSOUrl('google', 'http://localhost:5173/auth/callback')
    expect(url).toContain('/auth/v1/authorize')
  })
})

describe('getSSOUrl — github provider', () => {
  it('includes provider=github in the query string', () => {
    const url = getSSOUrl('github', 'http://localhost:5173/auth/callback')
    expect(url).toContain('provider=github')
  })

  it('does NOT contain provider=google when github is requested', () => {
    const url = getSSOUrl('github', 'http://localhost:5173/auth/callback')
    expect(url).not.toContain('provider=google')
  })

  it('returns a URL that starts with SUPABASE_URL + /auth/v1/authorize', () => {
    const url = getSSOUrl('github', 'http://localhost:5173/auth/callback')
    expect(url.startsWith(`${SUPABASE_URL}/auth/v1/authorize`)).toBe(true)
  })
})

describe('getSSOUrl — redirect_to encoding', () => {
  it('includes redirect_to param in the URL', () => {
    const redirect = 'http://localhost:5173/auth/callback'
    const url = getSSOUrl('google', redirect)
    expect(url).toContain('redirect_to=')
  })

  it('URL-encodes the redirect value — raw colon is not present after redirect_to=', () => {
    const redirect = 'http://localhost:5173/auth/callback'
    const url = getSSOUrl('google', redirect)
    // URLSearchParams encodes ':' as '%3A' so the literal "http://" must not
    // appear in the value portion of the param
    const afterKey = url.split('redirect_to=')[1] ?? ''
    expect(afterKey).not.toMatch(/^http:/)
  })

  it('produces a URL that is itself parseable', () => {
    const url = getSSOUrl('google', 'http://localhost:5173/auth/callback')
    // If SUPABASE_URL is empty (no env in test) the URL starts with /auth/...
    // which isn't an absolute URL, so we only test when we have a base.
    if (SUPABASE_URL) {
      expect(() => new URL(url)).not.toThrow()
    } else {
      // At minimum it should be a non-empty string
      expect(url.length).toBeGreaterThan(0)
    }
  })

  it('encodes a redirect URL with a query parameter', () => {
    const redirect = 'http://localhost:5173/auth/callback?next=/dashboard'
    const url = getSSOUrl('google', redirect)
    // The raw '?' in redirect should be percent-encoded
    const afterKey = url.split('redirect_to=')[1] ?? ''
    // Either the whole thing is encoded, or at minimum '?' from the redirect
    // does not appear raw (URLSearchParams encodes it as %3F)
    expect(afterKey).not.toMatch(/\?next=/)
  })
})

describe('getSSOUrl — URL structure', () => {
  it('puts ? before the query string params', () => {
    const url = getSSOUrl('google', 'http://localhost:5173/auth/callback')
    expect(url).toContain('?')
    // The ? should come after /authorize
    const questionIdx = url.indexOf('?')
    const authorizeIdx = url.indexOf('/authorize')
    expect(questionIdx).toBeGreaterThan(authorizeIdx)
  })

  it('returns different URLs for google vs github', () => {
    const googleUrl = getSSOUrl('google', 'http://localhost:5173/auth/callback')
    const githubUrl = getSSOUrl('github', 'http://localhost:5173/auth/callback')
    expect(googleUrl).not.toBe(githubUrl)
  })
})

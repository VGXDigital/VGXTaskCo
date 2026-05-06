// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { afterEach, describe, expect, it } from 'vitest'
import { clearToken, getToken, isLoggedIn, setToken } from './auth'

const TOKEN_KEY = 'vgxt-token'

afterEach(() => {
  localStorage.clear()
})

describe('setToken / getToken', () => {
  it('stores a token and retrieves it', () => {
    setToken('abc')
    expect(getToken()).toBe('abc')
  })

  it('overwrites a previously stored token', () => {
    setToken('first')
    setToken('second')
    expect(getToken()).toBe('second')
  })
})

describe('clearToken', () => {
  it('removes the stored token', () => {
    setToken('abc')
    clearToken()
    expect(getToken()).toBeNull()
  })

  it('is a no-op when no token exists', () => {
    clearToken()
    expect(getToken()).toBeNull()
  })
})

describe('isLoggedIn', () => {
  it('returns false when no token is stored', () => {
    expect(isLoggedIn()).toBe(false)
  })

  it('returns true after setToken', () => {
    setToken('abc')
    expect(isLoggedIn()).toBe(true)
  })

  it('returns false after clearToken', () => {
    setToken('abc')
    clearToken()
    expect(isLoggedIn()).toBe(false)
  })
})

describe('setToken regression — undefined must not be stored as the string "undefined"', () => {
  it('does NOT store the literal string "undefined" when passed undefined', () => {
    // This is the exact regression that broke login: caller passed undefined,
    // localStorage ended up with the string "undefined", isLoggedIn() returned true.
    setToken(undefined as unknown as string)
    const stored = localStorage.getItem(TOKEN_KEY)
    expect(stored).not.toBe('undefined')
  })

  it('getToken() after setToken(undefined) is null or throws — never the string "undefined"', () => {
    setToken(undefined as unknown as string)
    const token = getToken()
    expect(token).not.toBe('undefined')
  })
})

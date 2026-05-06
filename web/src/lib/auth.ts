// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

const TOKEN_KEY = 'vgxt-token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  // Guard: never store undefined/null as the literal string "undefined"/"null".
  // This regression caused isLoggedIn() to return true after a failed login
  // that returned no token.
  if (token == null || (token as unknown) === undefined) return
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function isLoggedIn(): boolean {
  return getToken() !== null
}

// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { clearToken, getToken } from './auth'

export const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)
  ?? (import.meta.env.PROD ? '/api' : 'http://localhost:4000')

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status}`
    try {
      const errorBody = (await response.json()) as { error?: string }
      if (errorBody.error) message = errorBody.error
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  const json = (await response.json()) as { data: T }
  return json.data
}

export const apiClient = {
  get<T>(path: string): Promise<T> {
    return request<T>('GET', path)
  },
  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>('POST', path, body)
  },
  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>('PATCH', path, body)
  },
  delete<T>(path: string): Promise<T> {
    return request<T>('DELETE', path)
  },
}

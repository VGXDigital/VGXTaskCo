// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { BASE_URL } from './api-client'
import { getToken } from './auth'

/**
 * Downloads a CSV from a backend endpoint that streams it.
 * Uses fetch with Bearer token, reads response as Blob, triggers browser download.
 *
 * @param path  e.g. '/projects/abc123/export/tasks.csv?status=DONE'
 * @param filename  derived from Content-Disposition header if not provided
 * @throws Error with message from response body on failure
 */
export async function downloadCSV(path: string, filename?: string): Promise<void> {
  const token = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!res.ok) {
    let message = `Export failed: ${res.status}`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  const disposition = res.headers.get('content-disposition') ?? ''
  const match = disposition.match(/filename="?([^";\r\n]+)"?/)
  const fname = filename ?? match?.[1] ?? 'vgxtaskco-export.csv'

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fname
  a.click()
  URL.revokeObjectURL(url)
}

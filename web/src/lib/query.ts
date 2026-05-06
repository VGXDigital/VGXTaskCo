// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

/**
 * Builds a URL query string from a flat filters record.
 * - Arrays are joined with a comma and emitted as a single param.
 * - Booleans emit the string "true" / "false".
 * - undefined values are skipped.
 * Returns a ?-prefixed string when any params are present, otherwise "".
 */
export function buildTaskQueryString(
  filters: Record<string, string | string[] | boolean | undefined>,
): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(','))
    } else if (typeof value === 'boolean') {
      if (value) params.set(key, 'true')
    } else {
      params.set(key, value)
    }
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

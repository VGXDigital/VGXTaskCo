// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { describe, expect, it } from 'vitest'
import { buildTaskQueryString } from './query'

describe('buildTaskQueryString — empty / no filters', () => {
  it('returns empty string for an empty object', () => {
    expect(buildTaskQueryString({})).toBe('')
  })

  it('returns empty string when all values are undefined', () => {
    expect(buildTaskQueryString({ status: undefined, priority: undefined })).toBe('')
  })
})

describe('buildTaskQueryString — single string filter', () => {
  it('returns ?key=value for one string param', () => {
    expect(buildTaskQueryString({ status: 'TODO' })).toBe('?status=TODO')
  })

  it('URL-encodes special characters in the value', () => {
    const qs = buildTaskQueryString({ search: 'hello world' })
    expect(qs).toBe('?search=hello+world')
  })
})

describe('buildTaskQueryString — array filters', () => {
  it('joins a single-item array as-is', () => {
    expect(buildTaskQueryString({ tagIds: ['a'] })).toBe('?tagIds=a')
  })

  it('joins multiple items with commas', () => {
    expect(buildTaskQueryString({ tagIds: ['a', 'b', 'c'] })).toBe('?tagIds=a%2Cb%2Cc')
  })

  it('skips an empty array — does not emit the key at all', () => {
    expect(buildTaskQueryString({ tagIds: [] })).toBe('')
  })
})

describe('buildTaskQueryString — boolean filters', () => {
  it('emits "true" for a boolean true value', () => {
    expect(buildTaskQueryString({ includeArchived: true })).toBe('?includeArchived=true')
  })

  it('skips a boolean false value entirely', () => {
    expect(buildTaskQueryString({ includeArchived: false })).toBe('')
  })

  it('skips undefined (same as false path)', () => {
    expect(buildTaskQueryString({ includeArchived: undefined })).toBe('')
  })
})

describe('buildTaskQueryString — multiple filters joined with &', () => {
  it('combines two string params', () => {
    const qs = buildTaskQueryString({ status: 'DONE', priority: 'HIGH' })
    expect(qs).toMatch(/^\?/)
    expect(qs).toContain('status=DONE')
    expect(qs).toContain('priority=HIGH')
    expect(qs).toContain('&')
  })

  it('combines string, array, and boolean params', () => {
    const qs = buildTaskQueryString({
      status: 'TODO',
      tagIds: ['tag-1', 'tag-2'],
      includeArchived: true,
    })
    expect(qs).toMatch(/^\?/)
    expect(qs).toContain('status=TODO')
    expect(qs).toContain('tagIds=')
    expect(qs).toContain('tag-1')
    expect(qs).toContain('tag-2')
    expect(qs).toContain('includeArchived=true')
  })

  it('omits undefined keys but includes defined ones', () => {
    const qs = buildTaskQueryString({
      status: 'IN_PROGRESS',
      priority: undefined,
      includeArchived: true,
    })
    expect(qs).toContain('status=IN_PROGRESS')
    expect(qs).not.toContain('priority')
    expect(qs).toContain('includeArchived=true')
  })
})

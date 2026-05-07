// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Task } from '../../types'
import { TaskCard } from './TaskCard'

// ── Mock framer-motion to avoid animation side-effects in unit tests ───────────

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      ({ children, onClick, className }, ref) =>
        React.createElement('div', { ref, onClick, className }, children)
    ),
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Fix the bug',
    status: 'TODO',
    priority: 'MEDIUM',
    projectId: 'proj-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TaskCard — renders task title', () => {
  it('shows the task title in the card', () => {
    const task = makeTask({ title: 'Deploy to production' })
    render(React.createElement(TaskCard, { task, onClick: vi.fn() }))
    expect(screen.getByText('Deploy to production')).toBeTruthy()
  })

  it('shows a different title correctly', () => {
    const task = makeTask({ title: 'Write unit tests' })
    render(React.createElement(TaskCard, { task, onClick: vi.fn() }))
    expect(screen.getByText('Write unit tests')).toBeTruthy()
  })
})

describe('TaskCard — priority badge', () => {
  it('renders a HIGH priority badge', () => {
    const task = makeTask({ priority: 'HIGH' })
    render(React.createElement(TaskCard, { task, onClick: vi.fn() }))
    expect(screen.getByText('High')).toBeTruthy()
  })

  it('renders a MEDIUM priority badge', () => {
    const task = makeTask({ priority: 'MEDIUM' })
    render(React.createElement(TaskCard, { task, onClick: vi.fn() }))
    expect(screen.getByText('Medium')).toBeTruthy()
  })

  it('renders a LOW priority badge', () => {
    const task = makeTask({ priority: 'LOW' })
    render(React.createElement(TaskCard, { task, onClick: vi.fn() }))
    expect(screen.getByText('Low')).toBeTruthy()
  })
})

describe('TaskCard — due date', () => {
  it('does NOT render a due date element when no dueDate is set', () => {
    const task = makeTask({ dueDate: undefined })
    render(React.createElement(TaskCard, { task, onClick: vi.fn() }))
    // "Jan" or similar month would appear if a date were rendered
    expect(screen.queryByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)).toBeNull()
  })

  it('renders the due date formatted as "MMM d"', () => {
    const task = makeTask({ dueDate: '2026-12-25T00:00:00Z' })
    render(React.createElement(TaskCard, { task, onClick: vi.fn() }))
    // date-fns format 'MMM d' → "Dec 25" (may vary by timezone, so just check Dec)
    expect(screen.getByText(/Dec/)).toBeTruthy()
  })
})

describe('TaskCard — overdue styling', () => {
  it('applies red overdue styling when task is not DONE and due date is in the past', () => {
    const task = makeTask({
      status: 'TODO',
      dueDate: '2020-01-01T00:00:00Z', // well in the past
    })
    const { container } = render(React.createElement(TaskCard, { task, onClick: vi.fn() }))
    // The overdue span has text-red-600 class
    const overdueEl = container.querySelector('.text-red-600, .text-red-400')
    expect(overdueEl).not.toBeNull()
  })

  it('does NOT apply overdue styling when task is DONE', () => {
    const task = makeTask({
      status: 'DONE',
      dueDate: '2020-01-01T00:00:00Z', // past, but DONE
    })
    const { container } = render(React.createElement(TaskCard, { task, onClick: vi.fn() }))
    const overdueEl = container.querySelector('.text-red-600, .text-red-400')
    expect(overdueEl).toBeNull()
  })

  it('does NOT apply overdue styling for a future due date', () => {
    const task = makeTask({
      status: 'TODO',
      dueDate: '2099-01-01T00:00:00Z', // far in the future
    })
    const { container } = render(React.createElement(TaskCard, { task, onClick: vi.fn() }))
    const overdueEl = container.querySelector('.text-red-600, .text-red-400')
    expect(overdueEl).toBeNull()
  })

  it('renders the AlertCircle icon for overdue tasks', () => {
    const task = makeTask({
      status: 'IN_PROGRESS',
      dueDate: '2020-01-01T00:00:00Z',
    })
    const { container } = render(React.createElement(TaskCard, { task, onClick: vi.fn() }))
    // lucide renders an SVG; the overdue span wraps it
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })
})

describe('TaskCard — click handler', () => {
  it('calls onClick when the card is clicked', () => {
    const handleClick = vi.fn()
    const task = makeTask()
    render(React.createElement(TaskCard, { task, onClick: handleClick }))
    fireEvent.click(screen.getByText('Fix the bug'))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('does NOT call onClick when nothing is clicked', () => {
    const handleClick = vi.fn()
    const task = makeTask()
    render(React.createElement(TaskCard, { task, onClick: handleClick }))
    expect(handleClick).not.toHaveBeenCalled()
  })
})


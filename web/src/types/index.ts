// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

export type User = {
  id: string
  email: string
  name: string
}

export type Project = {
  id: string
  name: string
  description?: string
  color: string
  ownerId: string
  createdAt: string
  updatedAt: string
  _count?: { tasks: number }
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH'

export type Task = {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  dueDate?: string
  archivedAt?: string
  projectId: string
  createdAt: string
  updatedAt: string
}

export type ApiToken = {
  id: string
  name: string
  prefix: string
  scope: string
  lastUsedAt?: string
  expiresAt?: string
  revokedAt?: string
  createdAt: string
}

export type ApiTokenCreated = ApiToken & { token: string }

export type WebhookEvent =
  | 'task.created'
  | 'task.updated'
  | 'task.status.changed'
  | 'task.completed'
  | 'task.archived'
  | 'task.unarchived'
  | 'task.deleted'
  | 'test'

export type Webhook = {
  id: string
  ownerId: string
  url: string
  events: WebhookEvent[]
  active: boolean
  createdAt: string
}

export type WebhookCreated = Webhook & { secret: string }

export type SavedViewFilter = {
  status?: TaskStatus[]
  priority?: Priority[]
  dueWithin?: 'today' | 'thisWeek' | 'overdue' | 'doneInLast7Days'
  search?: string
  includeArchived?: boolean
}

export type SavedView = {
  id: string
  name: string
  scope: string
  projectId?: string
  filter: SavedViewFilter
}

export type ApiResponse<T> = { data: T }

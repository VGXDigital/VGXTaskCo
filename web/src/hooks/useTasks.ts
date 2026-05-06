// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '../lib/api-client'
import type { ApiResponse, Task, TaskStatus } from '../types'

export type TaskFilters = {
  status?: TaskStatus
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  dueWithin?: 'today' | 'thisWeek' | 'overdue' | 'doneInLast7Days'
  search?: string
  includeArchived?: boolean
}

function buildQueryString(filters?: TaskFilters): string {
  if (!filters) return ''
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.priority) params.set('priority', filters.priority)
  if (filters.dueWithin) params.set('dueWithin', filters.dueWithin)
  if (filters.search) params.set('search', filters.search)
  if (filters.includeArchived) params.set('includeArchived', 'true')
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function useTasks(projectId: string, filters?: TaskFilters, options?: { enabled?: boolean }) {
  return useQuery<Task[]>({
    queryKey: ['tasks', projectId, filters],
    enabled: options?.enabled !== false && !!projectId,
    queryFn: () =>
      apiClient.get<Task[]>(`/projects/${projectId}/tasks${buildQueryString(filters)}`),
  })
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation<ApiResponse<Task>, Error, Partial<Task>>({
    mutationFn: (body) =>
      apiClient.post<ApiResponse<Task>>(`/projects/${projectId}/tasks`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks', projectId] })
      void qc.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation<ApiResponse<Task>, Error, { id: string; data: Partial<Task> }>({
    mutationFn: ({ id, data }) =>
      apiClient.patch<ApiResponse<Task>>(`/tasks/${id}`, data),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['task', variables.id] })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, { id: string; projectId: string }>({
    mutationFn: ({ id }) => apiClient.delete<unknown>(`/tasks/${id}`),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['tasks', variables.projectId] })
      void qc.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

export function useBulkUpdateTaskStatus() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, { ids: string[]; status: TaskStatus }>({
    mutationFn: (body) => apiClient.post<unknown>('/tasks/bulk/status', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

export function useBulkDeleteTasks() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, { ids: string[] }>({
    mutationFn: (body) => apiClient.post<unknown>('/tasks/bulk/delete', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] })
      void qc.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

export function useBulkArchiveTasks() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, { ids: string[] }>({
    mutationFn: (body) => apiClient.post<unknown>('/tasks/bulk/archive', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

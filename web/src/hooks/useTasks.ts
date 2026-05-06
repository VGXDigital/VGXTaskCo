// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '../lib/api-client'
import { buildTaskQueryString } from '../lib/query'
import type { ApiResponse, Task, TaskStatus } from '../types'

export type TaskFilters = {
  status?: TaskStatus
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  dueWithin?: 'today' | 'thisWeek' | 'overdue' | 'doneInLast7Days'
  search?: string
  includeArchived?: boolean
}

export function useTasks(projectId: string, filters?: TaskFilters, options?: { enabled?: boolean }) {
  return useQuery<Task[]>({
    queryKey: ['tasks', projectId, filters],
    enabled: options?.enabled !== false && !!projectId,
    queryFn: () =>
      apiClient.get<Task[]>(`/projects/${projectId}/tasks${buildTaskQueryString({ ...filters })}`),
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
  return useMutation<ApiResponse<Task>, Error, { id: string; projectId: string; data: Partial<Task> }>({
    mutationFn: ({ id, data }) =>
      apiClient.patch<ApiResponse<Task>>(`/tasks/${id}`, data),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['task', variables.id] })
      void qc.invalidateQueries({ queryKey: ['tasks', variables.projectId] })
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

// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '../lib/api-client'
import type { SavedView, SavedViewFilter } from '../types'

export type CreateViewPayload = {
  name: string
  scope: 'global' | 'project'
  projectId?: string
  filter: SavedViewFilter
}

export type UpdateViewPayload = {
  id: string
  data: Partial<Pick<SavedView, 'name' | 'filter'>>
}

export function useViews() {
  return useQuery<SavedView[]>({
    queryKey: ['views'],
    queryFn: () => apiClient.get<SavedView[]>('/views'),
  })
}

export function useProjectViews(projectId: string) {
  return useQuery<SavedView[]>({
    queryKey: ['views', 'project', projectId],
    queryFn: () => apiClient.get<SavedView[]>(`/projects/${projectId}/views`),
    enabled: Boolean(projectId),
  })
}

export function useCreateView() {
  const qc = useQueryClient()
  return useMutation<SavedView, Error, CreateViewPayload>({
    mutationFn: (body) => apiClient.post<SavedView>('/views', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['views'] })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

export function useUpdateView() {
  const qc = useQueryClient()
  return useMutation<SavedView, Error, UpdateViewPayload>({
    mutationFn: ({ id, data }) => apiClient.patch<SavedView>(`/views/${id}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['views'] })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

export function useDeleteView() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: (id) => apiClient.delete<unknown>(`/views/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['views'] })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '../lib/api-client'
import type { ApiResponse, Project } from '../types'

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => apiClient.get<Project[]>('/projects'),
  })
}

export function useProject(id: string) {
  return useQuery<Project>({
    queryKey: ['projects', id],
    queryFn: () => apiClient.get<Project>(`/projects/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation<ApiResponse<Project>, Error, Partial<Project>>({
    mutationFn: (body) => apiClient.post<ApiResponse<Project>>('/projects', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation<ApiResponse<Project>, Error, { id: string; data: Partial<Project> }>({
    mutationFn: ({ id, data }) =>
      apiClient.patch<ApiResponse<Project>>(`/projects/${id}`, data),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['projects'] })
      void qc.invalidateQueries({ queryKey: ['projects', variables.id] })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: (id) => apiClient.delete<unknown>(`/projects/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

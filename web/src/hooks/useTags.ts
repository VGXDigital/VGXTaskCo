// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '../lib/api-client'
import type { ApiResponse, Tag } from '../types'

export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: () => apiClient.get<Tag[]>('/tags'),
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation<ApiResponse<Tag>, Error, { value: string }>({
    mutationFn: (body) => apiClient.post<ApiResponse<Tag>>('/tags', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tags'] })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: (id) => apiClient.delete<unknown>(`/tags/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tags'] })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

export function useAttachTags(taskId: string) {
  const qc = useQueryClient()
  return useMutation<unknown, Error, { tagIds: string[] }>({
    mutationFn: (body) => apiClient.post<unknown>(`/tasks/${taskId}/tags`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['task', taskId] })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

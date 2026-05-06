// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '../lib/api-client'
import type { ApiToken, ApiTokenCreated } from '../types'

const QUERY_KEY = ['api-tokens']

/** GET /api-tokens — list all tokens for the current user */
export function useApiTokens() {
  return useQuery<ApiToken[]>({
    queryKey: QUERY_KEY,
    queryFn: () => apiClient.get<ApiToken[]>('/api-tokens'),
  })
}

/** POST /api-tokens — create a new token; raw token returned once */
export function useCreateApiToken() {
  const qc = useQueryClient()
  return useMutation<ApiTokenCreated, Error, { name: string; scope: 'user' | 'service'; expiresInDays?: number }>({
    mutationFn: (body) => apiClient.post<ApiTokenCreated>('/api-tokens', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

/** DELETE /api-tokens/:id — soft-revoke a token */
export function useRevokeApiToken() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: (id) => apiClient.delete<unknown>(`/api-tokens/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

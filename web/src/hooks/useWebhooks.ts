// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '../lib/api-client'
import type { Webhook, WebhookCreated, WebhookEvent } from '../types'

const QUERY_KEY = ['webhooks']

/** GET /webhooks — list all webhook endpoints for the current user */
export function useWebhooks() {
  return useQuery<Webhook[]>({
    queryKey: QUERY_KEY,
    queryFn: () => apiClient.get<Webhook[]>('/webhooks'),
  })
}

/** POST /webhooks — create a webhook; signing secret returned once */
export function useCreateWebhook() {
  const qc = useQueryClient()
  return useMutation<WebhookCreated, Error, { url: string; events: WebhookEvent[] }>({
    mutationFn: (body) => apiClient.post<WebhookCreated>('/webhooks', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

/** PATCH /webhooks/:id — update active flag or events list */
export function useUpdateWebhook() {
  const qc = useQueryClient()
  return useMutation<Webhook, Error, { id: string; data: { active?: boolean; events?: WebhookEvent[] } }>({
    mutationFn: ({ id, data }) => apiClient.patch<Webhook>(`/webhooks/${id}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

/** DELETE /webhooks/:id — permanently delete a webhook endpoint */
export function useDeleteWebhook() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: (id) => apiClient.delete<unknown>(`/webhooks/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

/** POST /webhooks/:id/rotate-secret — rotate signing secret; new secret returned once */
export function useRotateWebhookSecret() {
  const qc = useQueryClient()
  return useMutation<WebhookCreated, Error, string>({
    mutationFn: (id) => apiClient.post<WebhookCreated>(`/webhooks/${id}/rotate-secret`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

/** POST /webhooks/:id/test — fire a test event to the webhook */
export function useTestWebhook() {
  return useMutation<{ dispatched: boolean }, Error, string>({
    mutationFn: (id) => apiClient.post<{ dispatched: boolean }>(`/webhooks/${id}/test`, {}),
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

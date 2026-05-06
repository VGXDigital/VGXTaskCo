// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'

interface HealthResponse {
  status: string
  service: string
  version: string
}

declare const __APP_VERSION__: string

export function VGXFooter() {
  const { data } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: () => apiClient.get<HealthResponse>('/'),
    staleTime: Infinity,
  })

  const version = data?.version ?? __APP_VERSION__

  return (
    <p className="text-xs text-gray-400 dark:text-gray-500">
      © 2026 Built by{' '}
      <a
        href="https://vgx.digital"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-gray-500 transition-colors hover:text-primary dark:text-gray-400 dark:hover:text-primary-300"
      >
        VGX Digital
      </a>
      {' '}• v{version}
    </p>
  )
}

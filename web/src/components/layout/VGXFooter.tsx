// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'

interface HealthResponse {
  status: string
  service: string
  version: string
}

export function VGXFooter() {
  const { data } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: () => apiClient.get<HealthResponse>('/'),
    staleTime: Infinity,
  })

  return (
    <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
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
        {data?.version && <> • v{data.version}</>}
      </p>
    </div>
  )
}

// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { downloadCSV } from '../../lib/download-csv'
import { Button } from '../ui/Button'

interface ExportButtonProps {
  /** If set, exports tasks for a single project. */
  projectId?: string
  /** Query string to append, e.g. "?status=DONE&priority=HIGH" */
  currentFilters?: string
}

export function ExportButton({ projectId, currentFilters }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    const basePath = projectId
      ? `/projects/${projectId}/export/tasks.csv`
      : '/export/tasks.csv'
    const path = currentFilters ? `${basePath}${currentFilters}` : basePath

    setLoading(true)
    try {
      await downloadCSV(path)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleExport} disabled={loading}>
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      Export CSV
    </Button>
  )
}

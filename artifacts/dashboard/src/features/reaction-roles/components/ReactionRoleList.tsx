'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ReactionRolePanel } from '@/types/application'
import { formatDistanceToNow } from 'date-fns'

interface ReactionRoleListProps {
  panels: ReactionRolePanel[]
  onCreateNew: () => void
  onEdit: (panel: ReactionRolePanel) => void
  onDelete: (panelId: string) => Promise<void>
  onDeploy: (panelId: string) => Promise<void>
}

export function ReactionRoleList({
  panels,
  onCreateNew,
  onEdit,
  onDelete,
  onDeploy,
}: ReactionRoleListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deploying, setDeploying] = useState<string | null>(null)

  const handleDelete = async (panelId: string) => {
    if (!confirm('Are you sure you want to delete this panel?')) return
    setDeleting(panelId)
    try {
      await onDelete(panelId)
    } finally {
      setDeleting(null)
    }
  }

  const handleDeploy = async (panelId: string) => {
    setDeploying(panelId)
    try {
      await onDeploy(panelId)
    } finally {
      setDeploying(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'draft': return 'bg-yellow-500'
      case 'archived': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Reaction Role Panels</h2>
        <Button onClick={onCreateNew}>Create New Panel</Button>
      </div>

      {panels.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No reaction role panels created yet. Create your first panel to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {panels.map((panel) => (
            <Card key={panel.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(panel.status)}`} />
                    <CardTitle className="text-lg">{panel.name}</CardTitle>
                  </div>
                  <Badge variant="outline" className="capitalize">{panel.status}</Badge>
                </div>
                {panel.description && (
                  <CardDescription>{panel.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  {panel.targetChannelName && (
                    <p className="text-muted-foreground">Channel: {panel.targetChannelName}</p>
                  )}
                  <p className="text-muted-foreground">
                    Options: {panel.options.length}
                  </p>
                  <p className="text-muted-foreground">
                    Multi-select: {panel.multiSelect ? 'Yes' : 'No'}
                  </p>
                </div>

                {panel.deployedAt && (
                  <p className="text-xs text-muted-foreground">
                    Deployed {formatDistanceToNow(new Date(panel.deployedAt), { addSuffix: true })}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(panel)}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  {panel.status !== 'active' ? (
                    <Button
                      size="sm"
                      onClick={() => handleDeploy(panel.id)}
                      disabled={deploying === panel.id}
                      className="flex-1"
                    >
                      {deploying === panel.id ? 'Deploying...' : 'Deploy'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(panel.id)}
                      disabled={deleting === panel.id}
                      className="flex-1"
                    >
                      {deleting === panel.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

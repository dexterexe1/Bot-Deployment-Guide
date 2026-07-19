'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TicketPanel } from '@/types/application'
import { formatDistanceToNow } from 'date-fns'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { PlusCircle, Edit2, Trash2, Send, Ticket } from 'lucide-react'

interface TicketPanelListProps {
  panels: TicketPanel[]
  tickets: unknown[]
  onCreateNew: () => void
  onEdit: (panel: TicketPanel) => void
  onDelete: (panelId: string) => Promise<void>
  onDeploy: (panelId: string) => Promise<void>
}

function statusBadge(status: string) {
  if (status === 'active') return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 capitalize">Active</Badge>
  if (status === 'draft') return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 capitalize">Draft</Badge>
  return <Badge variant="secondary" className="capitalize">{status}</Badge>
}

export function TicketPanelList({
  panels,
  onCreateNew,
  onEdit,
  onDelete,
  onDeploy,
}: TicketPanelListProps) {
  const [deploying, setDeploying] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDeploy = async (panelId: string) => {
    setDeploying(panelId)
    try {
      await onDeploy(panelId)
    } finally {
      setDeploying(null)
    }
  }

  const handleDelete = async (panelId: string) => {
    setDeleting(panelId)
    try {
      await onDelete(panelId)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Ticket Panels</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Each panel sends a button to Discord. Members click it to open a ticket.
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Panel
        </Button>
      </div>

      {/* Empty state */}
      {panels.length === 0 && (
        <Card className="border-dashed border-border/60">
          <CardContent className="py-16 flex flex-col items-center gap-4">
            <div className="rounded-full bg-muted p-4">
              <Ticket className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">No ticket panels yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create a panel and deploy it to a channel so members can open support tickets.
              </p>
            </div>
            <Button onClick={onCreateNew} variant="outline">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create first panel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Panel grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {panels.map((panel) => (
          <Card key={panel.id} className="border-border/60 bg-background/70 backdrop-blur flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base truncate">{panel.name}</CardTitle>
                  {panel.description && (
                    <CardDescription className="mt-0.5 line-clamp-2">{panel.description}</CardDescription>
                  )}
                </div>
                {statusBadge(panel.status)}
              </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-3 pt-0">
              {/* Info */}
              <div className="text-xs text-muted-foreground space-y-1">
                {panel.targetChannelName && (
                  <p># {panel.targetChannelName}</p>
                )}
                {panel.categoryName && (
                  <p>Category: {panel.categoryName}</p>
                )}
                {panel.supportRoleNames?.length > 0 && (
                  <p>Support: {panel.supportRoleNames.join(', ')}</p>
                )}
                <p>Limit: {panel.ticketLimit ?? 'Unlimited'} per user</p>
              </div>

              {panel.deployedAt && (
                <p className="text-[11px] text-muted-foreground/70">
                  Deployed {formatDistanceToNow(new Date(panel.deployedAt), { addSuffix: true })}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onEdit(panel)}
                >
                  <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleDeploy(panel.id)}
                  disabled={deploying === panel.id}
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  {deploying === panel.id ? 'Sending…' : panel.status === 'active' ? 'Redeploy' : 'Deploy'}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={deleting === panel.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{panel.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the panel configuration. The bot button already sent to Discord
                        will stop working.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDelete(panel.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

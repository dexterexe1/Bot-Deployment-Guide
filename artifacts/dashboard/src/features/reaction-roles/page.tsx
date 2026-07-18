'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { ReactionRoleList } from './components/ReactionRoleList'
import { ReactionRoleEditor } from './components/ReactionRoleEditor'
import type { ReactionRolePanel, GuildResourceSnapshot } from '@/types/application'
import { toast } from 'sonner'
import { BunnyMascot } from '@/components/BunnyMascot'

export function ReactionRolesPage() {
  const params = useParams({ strict: false }) as { guildId?: string }
  const guildId = params.guildId
  const queryClient = useQueryClient()
  const [editingPanel, setEditingPanel] = useState<ReactionRolePanel | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)

  const { data: panels, isLoading: panelsLoading } = useQuery<ReactionRolePanel[]>({
    queryKey: ['/api/v1/guilds/{guildId}/reaction-roles/panels', { guildId }],
    enabled: !!guildId,
  })

  const { data: resources } = useQuery<GuildResourceSnapshot>({
    queryKey: ['/api/v1/guilds/{guildId}/resources', { guildId }],
    enabled: !!guildId,
  })

  const createPanel = useMutation({
    mutationFn: async (data: Partial<ReactionRolePanel>) => {
      const res = await api.post(`/api/v1/guilds/${guildId}/reaction-roles/panels`, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/guilds/{guildId}/reaction-roles/panels', { guildId }] })
      setCreatingNew(false)
      toast.success('Panel created successfully')
    },
    onError: () => {
      toast.error('Failed to create panel')
    },
  })

  const updatePanel = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ReactionRolePanel> }) => {
      const res = await api.put(`/api/v1/guilds/${guildId}/reaction-roles/panels/${id}`, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/guilds/{guildId}/reaction-roles/panels', { guildId }] })
      setEditingPanel(null)
      toast.success('Panel updated successfully')
    },
    onError: () => {
      toast.error('Failed to update panel')
    },
  })

  const deletePanel = useMutation({
    mutationFn: async (panelId: string) => {
      await api.delete(`/api/v1/guilds/${guildId}/reaction-roles/panels/${panelId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/guilds/{guildId}/reaction-roles/panels', { guildId }] })
      toast.success('Panel deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete panel')
    },
  })

  const deployPanel = useMutation({
    mutationFn: async (panelId: string) => {
      await api.post(`/api/v1/guilds/${guildId}/reaction-roles/panels/${panelId}/deploy`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/guilds/{guildId}/reaction-roles/panels', { guildId }] })
      toast.success('Panel deployed successfully')
    },
    onError: () => {
      toast.error('Failed to deploy panel')
    },
  })

  const handleSave = async (data: Partial<ReactionRolePanel>) => {
    if (editingPanel) {
      await updatePanel.mutateAsync({ id: editingPanel.id, data })
    } else {
      await createPanel.mutateAsync(data)
    }
  }

  if (panelsLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-4">
        <BunnyMascot size="lg" animated />
        <div>Loading...</div>
      </div>
    )
  }

  if (creatingNew || editingPanel) {
    return (
      <div className="p-6">
        <ReactionRoleEditor
          panel={editingPanel}
          channels={resources?.channels ?? []}
          roles={resources?.roles ?? []}
          onSave={handleSave}
          onCancel={() => {
            setCreatingNew(false)
            setEditingPanel(null)
          }}
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Reaction Roles</CardTitle>
          <CardDescription>Manage reaction role panels for your server</CardDescription>
        </CardHeader>
        <CardContent>
          <ReactionRoleList
            panels={panels ?? []}
            onCreateNew={() => setCreatingNew(true)}
            onEdit={(panel) => setEditingPanel(panel)}
            onDelete={deletePanel.mutateAsync}
            onDeploy={deployPanel.mutateAsync}
          />
        </CardContent>
      </Card>
    </div>
  )
}

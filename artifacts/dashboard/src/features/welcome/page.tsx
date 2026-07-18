'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { WelcomeSettings } from './components/WelcomeSettings'
import type { WelcomeConfig, GuildResourceSnapshot } from '@/types/application'
import { toast } from 'sonner'

export function WelcomePage() {
  const params = useParams({ strict: false }) as { guildId?: string }
  const guildId = params.guildId
  const queryClient = useQueryClient()

  const { data: config, isLoading: configLoading } = useQuery<WelcomeConfig>({
    queryKey: ['/api/v1/guilds/{guildId}/welcome/config', { guildId }],
    enabled: !!guildId,
  })

  const { data: resources } = useQuery<GuildResourceSnapshot>({
    queryKey: ['/api/v1/guilds/{guildId}/resources', { guildId }],
    enabled: !!guildId,
  })

  const saveConfig = useMutation({
    mutationFn: async (data: Partial<WelcomeConfig>) => {
      const res = await api.put(`/api/v1/guilds/${guildId}/welcome/config`, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/guilds/{guildId}/welcome/config', { guildId }] })
      toast.success('Welcome settings saved successfully')
    },
    onError: () => {
      toast.error('Failed to save welcome settings')
    },
  })

  const handleSave = async (data: Partial<WelcomeConfig>) => {
    await saveConfig.mutateAsync(data)
  }

  if (configLoading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome System</CardTitle>
          <CardDescription>Configure welcome messages for new members</CardDescription>
        </CardHeader>
        <CardContent>
          <WelcomeSettings
            config={config ?? null}
            channels={resources?.channels ?? []}
            roles={resources?.roles ?? []}
            onSave={handleSave}
          />
        </CardContent>
      </Card>
    </div>
  )
}

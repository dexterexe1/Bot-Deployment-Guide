'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { LoggingSettings } from './components/LoggingSettings'
import type { LogConfig, GuildResourceSnapshot } from '@/types/application'
import { toast } from 'sonner'
import { BunnyMascot } from '@/components/BunnyMascot'

export function LoggingPage() {
  const params = useParams({ strict: false }) as { guildId?: string }
  const guildId = params.guildId
  const queryClient = useQueryClient()

  const { data: config, isLoading: configLoading } = useQuery<LogConfig>({
    queryKey: ['/api/v1/guilds/{guildId}/logging/config', { guildId }],
    enabled: !!guildId,
  })

  const { data: resources } = useQuery<GuildResourceSnapshot>({
    queryKey: ['/api/v1/guilds/{guildId}/resources', { guildId }],
    enabled: !!guildId,
  })

  const saveConfig = useMutation({
    mutationFn: async (data: Partial<LogConfig>) => {
      const res = await api.put(`/api/v1/guilds/${guildId}/logging/config`, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/guilds/{guildId}/logging/config', { guildId }] })
      toast.success('Logging settings saved successfully')
    },
    onError: () => {
      toast.error('Failed to save logging settings')
    },
  })

  const handleSave = async (data: Partial<LogConfig>) => {
    await saveConfig.mutateAsync(data)
  }

  if (configLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-4">
        <BunnyMascot size="lg" animated />
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Logging System</CardTitle>
          <CardDescription>Configure server event logging</CardDescription>
        </CardHeader>
        <CardContent>
          <LoggingSettings
            config={config ?? null}
            channels={resources?.channels ?? []}
            onSave={handleSave}
          />
        </CardContent>
      </Card>
    </div>
  )
}

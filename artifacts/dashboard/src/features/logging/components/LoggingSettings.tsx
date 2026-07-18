'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { LogConfig, GuildResourceChannel } from '@/types/application'

interface LoggingSettingsProps {
  config?: LogConfig | null
  channels: GuildResourceChannel[]
  onSave: (data: Partial<LogConfig>) => Promise<void>
}

export function LoggingSettings({ config, channels, onSave }: LoggingSettingsProps) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, setValue } = useForm<Partial<LogConfig>>({
    defaultValues: {
      enabled: config?.enabled ?? false,
      logChannelId: config?.logChannelId ?? '',
      messageLogs: config?.messageLogs ?? false,
      messageDeleteLogs: config?.messageDeleteLogs ?? false,
      messageUpdateLogs: config?.messageUpdateLogs ?? false,
      bulkDeleteLogs: config?.bulkDeleteLogs ?? false,
      memberLogs: config?.memberLogs ?? false,
      memberJoinLogs: config?.memberJoinLogs ?? false,
      memberLeaveLogs: config?.memberLeaveLogs ?? false,
      memberUpdateLogs: config?.memberUpdateLogs ?? false,
      moderationLogs: config?.moderationLogs ?? false,
      banLogs: config?.banLogs ?? false,
      kickLogs: config?.kickLogs ?? false,
      muteLogs: config?.muteLogs ?? false,
      warnLogs: config?.warnLogs ?? false,
      voiceLogs: config?.voiceLogs ?? false,
      voiceJoinLogs: config?.voiceJoinLogs ?? false,
      voiceLeaveLogs: config?.voiceLeaveLogs ?? false,
      voiceMoveLogs: config?.voiceMoveLogs ?? false,
      serverUpdateLogs: config?.serverUpdateLogs ?? false,
      channelCreateLogs: config?.channelCreateLogs ?? false,
      channelDeleteLogs: config?.channelDeleteLogs ?? false,
      channelUpdateLogs: config?.channelUpdateLogs ?? false,
      roleCreateLogs: config?.roleCreateLogs ?? false,
      roleDeleteLogs: config?.roleDeleteLogs ?? false,
      roleUpdateLogs: config?.roleUpdateLogs ?? false,
      inviteLogs: config?.inviteLogs ?? false,
      stickerLogs: config?.stickerLogs ?? false,
      emojiLogs: config?.emojiLogs ?? false,
      webhookLogs: config?.webhookLogs ?? false,
    },
  })

  const onSubmit = async (data: Partial<LogConfig>) => {
    setLoading(true)
    try {
      await onSave(data)
    } finally {
      setLoading(false)
    }
  }

  const ToggleRow = ({ label, field }: { label: string; field: keyof LogConfig }) => (
    <div className="flex items-center justify-between py-2">
      <Label htmlFor={field}>{label}</Label>
      <Switch
        id={field}
        checked={watch(field) as boolean}
        onCheckedChange={(v) => setValue(field, v)}
      />
    </div>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Logging Configuration</CardTitle>
          <CardDescription>Configure server logging settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b">
            <div>
              <Label className="text-base font-semibold">Enable Logging</Label>
              <p className="text-sm text-muted-foreground">Turn logging on or off for this server</p>
            </div>
            <Switch
              checked={watch('enabled')}
              onCheckedChange={(v) => setValue('enabled', v)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logChannelId">Log Channel</Label>
            <Select onValueChange={(v) => setValue('logChannelId', v)} defaultValue={watch('logChannelId')}>
              <SelectTrigger>
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                {channels.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Message Logs</h4>
              <div className="space-y-1 pl-4 border-l-2">
                <ToggleRow label="Message Delete" field="messageDeleteLogs" />
                <ToggleRow label="Message Update" field="messageUpdateLogs" />
                <ToggleRow label="Bulk Delete" field="bulkDeleteLogs" />
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Member Logs</h4>
              <div className="space-y-1 pl-4 border-l-2">
                <ToggleRow label="Member Join" field="memberJoinLogs" />
                <ToggleRow label="Member Leave" field="memberLeaveLogs" />
                <ToggleRow label="Member Update" field="memberUpdateLogs" />
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Moderation Logs</h4>
              <div className="space-y-1 pl-4 border-l-2">
                <ToggleRow label="Ban" field="banLogs" />
                <ToggleRow label="Kick" field="kickLogs" />
                <ToggleRow label="Mute" field="muteLogs" />
                <ToggleRow label="Warn" field="warnLogs" />
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Voice Logs</h4>
              <div className="space-y-1 pl-4 border-l-2">
                <ToggleRow label="Voice Join" field="voiceJoinLogs" />
                <ToggleRow label="Voice Leave" field="voiceLeaveLogs" />
                <ToggleRow label="Voice Move" field="voiceMoveLogs" />
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Server Update Logs</h4>
              <div className="space-y-1 pl-4 border-l-2">
                <ToggleRow label="Channel Create" field="channelCreateLogs" />
                <ToggleRow label="Channel Delete" field="channelDeleteLogs" />
                <ToggleRow label="Channel Update" field="channelUpdateLogs" />
                <ToggleRow label="Role Create" field="roleCreateLogs" />
                <ToggleRow label="Role Delete" field="roleDeleteLogs" />
                <ToggleRow label="Role Update" field="roleUpdateLogs" />
                <ToggleRow label="Invite Create/Delete" field="inviteLogs" />
                <ToggleRow label="Emoji Create/Delete" field="emojiLogs" />
                <ToggleRow label="Webhook Create/Delete" field="webhookLogs" />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}

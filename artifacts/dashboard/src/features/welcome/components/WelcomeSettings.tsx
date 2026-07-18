'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { WelcomeConfig, GuildResourceChannel, GuildResourceRole } from '@/types/application'

interface WelcomeSettingsProps {
  config?: WelcomeConfig | null
  channels: GuildResourceChannel[]
  roles: GuildResourceRole[]
  onSave: (data: Partial<WelcomeConfig>) => Promise<void>
}

export function WelcomeSettings({ config, channels, roles, onSave }: WelcomeSettingsProps) {
  const [loading, setLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  const { register, handleSubmit, watch, setValue } = useForm<Partial<WelcomeConfig>>({
    defaultValues: {
      enabled: config?.enabled ?? false,
      channelId: config?.channelId ?? '',
      message: config?.message ?? 'Welcome {user} to {server}!',
      embed: config?.embed ?? { title: 'Welcome!', description: 'We\'re glad to have you here!', color: '#5865F2', footer: 'United Bunnies', thumbnail: null, image: null },
      autoRoleId: config?.autoRoleId ?? '',
      dmEnabled: config?.dmEnabled ?? false,
      dmMessage: config?.dmMessage ?? 'Welcome to our server!',
      captchaEnabled: config?.captchaEnabled ?? false,
      verificationRoleId: config?.verificationRoleId ?? '',
      welcomeImage: config?.welcomeImage ?? '',
      bannerImage: config?.bannerImage ?? '',
      thumbnailImage: config?.thumbnailImage ?? '',
    },
  })

  const embedTitle = watch('embed.title')
  const embedDescription = watch('embed.description')
  const embedColor = watch('embed.color')
  const embedFooter = watch('embed.footer')

  const onSubmit = async (data: Partial<WelcomeConfig>) => {
    setLoading(true)
    try {
      await onSave(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Welcome Configuration</CardTitle>
          <CardDescription>Configure welcome messages for new members</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b">
            <div>
              <Label className="font-semibold">Enable Welcome Messages</Label>
              <p className="text-sm text-muted-foreground">Send welcome messages when users join</p>
            </div>
            <Switch
              checked={watch('enabled')}
              onCheckedChange={(v) => setValue('enabled', v)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channelId">Welcome Channel</Label>
            <Select onValueChange={(v) => setValue('channelId', v)} defaultValue={watch('channelId')}>
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

          <div className="space-y-2">
            <Label htmlFor="message">Welcome Message</Label>
            <Textarea id="message" {...register('message')} placeholder="Welcome {user} to {server}!" rows={3} />
            <p className="text-xs text-muted-foreground">Variables: {'{user}'}, {'{server}'}, {'{mention}'}</p>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-3">Embed Settings</h4>
            <div className="space-y-2">
              <Label htmlFor="embedTitle">Embed Title</Label>
              <Input id="embedTitle" {...register('embed.title')} placeholder="Welcome!" />
            </div>
            <div className="space-y-2 mt-2">
              <Label htmlFor="embedDescription">Embed Description</Label>
              <Textarea id="embedDescription" {...register('embed.description')} placeholder="We're glad to have you!" rows={2} />
            </div>
            <div className="space-y-2 mt-2">
              <Label htmlFor="embedColor">Embed Color</Label>
              <Input id="embedColor" {...register('embed.color')} placeholder="#5865F2" />
            </div>
            <div className="space-y-2 mt-2">
              <Label htmlFor="embedFooter">Embed Footer</Label>
              <Input id="embedFooter" {...register('embed.footer')} placeholder="United Bunnies" />
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-3">Images</h4>
            <div className="space-y-2">
              <Label htmlFor="welcomeImage">Welcome Image URL</Label>
              <Input id="welcomeImage" {...register('welcomeImage')} placeholder="https://..." />
            </div>
            <div className="space-y-2 mt-2">
              <Label htmlFor="bannerImage">Banner Image URL</Label>
              <Input id="bannerImage" {...register('bannerImage')} placeholder="https://..." />
            </div>
            <div className="space-y-2 mt-2">
              <Label htmlFor="thumbnailImage">Thumbnail Image URL</Label>
              <Input id="thumbnailImage" {...register('thumbnailImage')} placeholder="https://..." />
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-3">Auto Role</h4>
            <div className="space-y-2">
              <Label htmlFor="autoRoleId">Auto Role</Label>
              <Select onValueChange={(v) => setValue('autoRoleId', v)} defaultValue={watch('autoRoleId')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-3">DM Welcome</h4>
            <div className="flex items-center space-x-2">
              <Switch
                checked={watch('dmEnabled')}
                onCheckedChange={(v) => setValue('dmEnabled', v)}
              />
              <Label>Send DM Welcome</Label>
            </div>
            {watch('dmEnabled') && (
              <div className="space-y-2 mt-2">
                <Label htmlFor="dmMessage">DM Message</Label>
                <Textarea id="dmMessage" {...register('dmMessage')} placeholder="Welcome to our server!" rows={2} />
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-3">Captcha Verification</h4>
            <div className="flex items-center space-x-2">
              <Switch
                checked={watch('captchaEnabled')}
                onCheckedChange={(v) => setValue('captchaEnabled', v)}
              />
              <Label>Enable Captcha</Label>
            </div>
            {watch('captchaEnabled') && (
              <div className="space-y-2 mt-2">
                <Label htmlFor="verificationRoleId">Verification Role</Label>
                <Select onValueChange={(v) => setValue('verificationRoleId', v)} defaultValue={watch('verificationRoleId')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setPreviewMode(!previewMode)}>
              {previewMode ? 'Hide Preview' : 'Show Preview'}
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {previewMode && (
        <Card>
          <CardHeader>
            <CardTitle>Discord Preview</CardTitle>
            <CardDescription>Live preview of your welcome message</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-[#36393f] rounded-lg p-4 space-y-3">
              {embedTitle && (
                <div className="border-l-4 pl-3 py-1" style={{ borderColor: embedColor || '#5865F2' }}>
                  <h4 className="font-semibold text-white">{embedTitle}</h4>
                  {embedDescription && (
                    <p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap">{embedDescription}</p>
                  )}
                  {embedFooter && (
                    <p className="text-gray-400 text-xs mt-2">{embedFooter}</p>
                  )}
                </div>
              )}
              {watch('message') && (
                <p className="text-gray-300 text-sm mt-2">{watch('message')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

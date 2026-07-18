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
import type { TicketPanel, GuildResourceChannel, GuildResourceRole, GuildResourceCategory } from '@/types/application'

interface TicketPanelEditorProps {
  panel?: TicketPanel | null
  channels: GuildResourceChannel[]
  roles: GuildResourceRole[]
  categories: GuildResourceCategory[]
  onSave: (data: Partial<TicketPanel>) => Promise<void>
  onCancel: () => void
}

type TicketPanelButtonStyle = 'primary' | 'secondary' | 'success' | 'danger' | 'blurple' | 'grey'

export function TicketPanelEditor({
  panel,
  channels,
  roles,
  categories,
  onSave,
  onCancel,
}: TicketPanelEditorProps) {
  const [loading, setLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  const { register, handleSubmit, watch, setValue } = useForm<Partial<TicketPanel>>({
    defaultValues: {
      name: panel?.name ?? '',
      description: panel?.description ?? '',
      status: panel?.status ?? 'draft',
      targetChannelId: panel?.targetChannelId ?? '',
      logChannelId: panel?.logChannelId ?? '',
      categoryId: panel?.categoryId ?? '',
      supportRoleIds: panel?.supportRoleIds ?? [],
      button: panel?.button ?? { label: 'Create Ticket', style: 'primary', emoji: '🎫' },
      embed: panel?.embed ?? { title: 'Support Tickets', description: 'Click the button below to create a support ticket.', color: '#5865F2', footer: 'United Bunnies', thumbnail: null, image: null },
      ticketLimit: panel?.ticketLimit ?? 1,
      ticketPrefix: panel?.ticketPrefix ?? 'ticket',
      transcriptEnabled: panel?.transcriptEnabled ?? true,
      transcriptChannelId: panel?.transcriptChannelId ?? '',
      closeMessage: panel?.closeMessage ?? 'Thank you for contacting support. This ticket will now be closed.',
      closeReasonRequired: panel?.closeReasonRequired ?? false,
    },
  })

  const buttonStyle = watch('button.style') as TicketPanelButtonStyle
  const buttonLabel = watch('button.label')
  const buttonEmoji = watch('button.emoji')
  const embedTitle = watch('embed.title')
  const embedDescription = watch('embed.description')
  const embedColor = watch('embed.color')
  const embedFooter = watch('embed.footer')

  const getButtonColors = (style: TicketPanelButtonStyle) => {
    switch (style) {
      case 'primary': return 'bg-blue-500 hover:bg-blue-600'
      case 'secondary': return 'bg-gray-500 hover:bg-gray-600'
      case 'success': return 'bg-green-500 hover:bg-green-600'
      case 'danger': return 'bg-red-500 hover:bg-red-600'
      case 'blurple': return 'bg-[#5865F2] hover:bg-[#4752C4]'
      case 'grey': return 'bg-[#4E5058] hover:bg-[#5C5E66]'
      default: return 'bg-blue-500 hover:bg-blue-600'
    }
  }

  const onSubmit = async (data: Partial<TicketPanel>) => {
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
          <CardTitle>Ticket Panel Configuration</CardTitle>
          <CardDescription>Configure your ticket panel settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Panel Name</Label>
            <Input id="name" {...register('name')} placeholder="Support Tickets" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} placeholder="Get help from our support team" rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select onValueChange={(v) => setValue('status', v as 'draft' | 'active' | 'archived')} defaultValue={watch('status')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetChannelId">Target Channel</Label>
            <Select onValueChange={(v) => setValue('targetChannelId', v)} defaultValue={watch('targetChannelId')}>
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

          <div className="space-y-2">
            <Label htmlFor="categoryId">Ticket Category</Label>
            <Select onValueChange={(v) => setValue('categoryId', v)} defaultValue={watch('categoryId')}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Support Roles</Label>
            <div className="space-y-2">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center space-x-2">
                  <Switch
                    checked={watch('supportRoleIds')?.includes(role.id)}
                    onCheckedChange={(checked) => {
                      const current = watch('supportRoleIds') ?? []
                      if (checked) {
                        setValue('supportRoleIds', [...current, role.id])
                      } else {
                        setValue('supportRoleIds', current.filter((id) => id !== role.id))
                      }
                    }}
                  />
                  <span className="text-sm">{role.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticketLimit">Ticket Limit per User</Label>
            <Input id="ticketLimit" type="number" {...register('ticketLimit')} min={1} max={10} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticketPrefix">Ticket Prefix</Label>
            <Input id="ticketPrefix" {...register('ticketPrefix')} placeholder="ticket" />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={watch('transcriptEnabled')}
              onCheckedChange={(v) => setValue('transcriptEnabled', v)}
            />
            <Label>Enable Transcripts</Label>
          </div>

          {watch('transcriptEnabled') && (
            <div className="space-y-2">
              <Label htmlFor="transcriptChannelId">Transcript Channel</Label>
              <Select onValueChange={(v) => setValue('transcriptChannelId', v)} defaultValue={watch('transcriptChannelId')}>
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
          )}

          <div className="space-y-2">
            <Label htmlFor="closeMessage">Close Message</Label>
            <Textarea id="closeMessage" {...register('closeMessage')} placeholder="Thank you for contacting support..." rows={2} />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={watch('closeReasonRequired')}
              onCheckedChange={(v) => setValue('closeReasonRequired', v)}
            />
            <Label>Require Close Reason</Label>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-3">Button Settings</h4>
            <div className="space-y-2">
              <Label htmlFor="buttonLabel">Button Label</Label>
              <Input id="buttonLabel" {...register('button.label')} placeholder="Create Ticket" />
            </div>
            <div className="space-y-2 mt-2">
              <Label htmlFor="buttonEmoji">Button Emoji</Label>
              <Input id="buttonEmoji" {...register('button.emoji')} placeholder="🎫" />
            </div>
            <div className="space-y-2 mt-2">
              <Label htmlFor="buttonStyle">Button Style</Label>
              <Select onValueChange={(v) => setValue('button.style', v as TicketPanelButtonStyle)} defaultValue={buttonStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary (Blue)</SelectItem>
                  <SelectItem value="secondary">Secondary (Gray)</SelectItem>
                  <SelectItem value="success">Success (Green)</SelectItem>
                  <SelectItem value="danger">Danger (Red)</SelectItem>
                  <SelectItem value="blurple">Blurple</SelectItem>
                  <SelectItem value="grey">Grey</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-3">Embed Settings</h4>
            <div className="space-y-2">
              <Label htmlFor="embedTitle">Embed Title</Label>
              <Input id="embedTitle" {...register('embed.title')} placeholder="Support Tickets" />
            </div>
            <div className="space-y-2 mt-2">
              <Label htmlFor="embedDescription">Embed Description</Label>
              <Textarea id="embedDescription" {...register('embed.description')} placeholder="Click the button below..." rows={3} />
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

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setPreviewMode(!previewMode)}>
              {previewMode ? 'Hide Preview' : 'Show Preview'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={loading}>
              {loading ? 'Saving...' : 'Save Panel'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {previewMode && (
        <Card>
          <CardHeader>
            <CardTitle>Discord Preview</CardTitle>
            <CardDescription>Live preview of your ticket panel</CardDescription>
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
              <div className="pt-2">
                <button className={`${getButtonColors(buttonStyle)} text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium`}>
                  {buttonEmoji && <span>{buttonEmoji}</span>}
                  {buttonLabel || 'Create Ticket'}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

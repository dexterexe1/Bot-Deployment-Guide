'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { ReactionRolePanel, GuildResourceChannel, GuildResourceRole } from '@/types/application'

interface ReactionRoleEditorProps {
  panel?: ReactionRolePanel | null
  channels: GuildResourceChannel[]
  roles: GuildResourceRole[]
  onSave: (data: Partial<ReactionRolePanel>) => Promise<void>
  onCancel: () => void
}

export function ReactionRoleEditor({
  panel,
  channels,
  roles,
  onSave,
  onCancel,
}: ReactionRoleEditorProps) {
  const [loading, setLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  const { register, handleSubmit, watch, setValue } = useForm<Partial<ReactionRolePanel>>({
    defaultValues: {
      name: panel?.name ?? '',
      description: panel?.description ?? '',
      status: panel?.status ?? 'draft',
      targetChannelId: panel?.targetChannelId ?? '',
      embed: panel?.embed ?? { title: 'Reaction Roles', description: 'Select your roles below.', color: '#5865F2', footer: 'United Bunnies', thumbnail: null, image: null },
      options: panel?.options ?? [],
      multiSelect: panel?.multiSelect ?? false,
      removeOnReact: panel?.removeOnReact ?? false,
    },
  })

  const { fields: options, append: appendOption, remove: removeOption } = useFieldArray({
    control: watch() as any,
    name: 'options',
  })

  const embedTitle = watch('embed.title')
  const embedDescription = watch('embed.description')
  const embedColor = watch('embed.color')
  const embedFooter = watch('embed.footer')
  const multiSelect = watch('multiSelect')
  const removeOnReact = watch('removeOnReact')

  const onSubmit = async (data: Partial<ReactionRolePanel>) => {
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
          <CardTitle>Reaction Role Panel Configuration</CardTitle>
          <CardDescription>Configure your reaction role panel settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Panel Name</Label>
            <Input id="name" {...register('name')} placeholder="Role Selection" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} placeholder="Choose your roles" rows={3} />
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

          <div className="flex items-center space-x-2">
            <Switch
              checked={multiSelect}
              onCheckedChange={(v) => setValue('multiSelect', v)}
            />
            <Label>Allow Multiple Roles</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={removeOnReact}
              onCheckedChange={(v) => setValue('removeOnReact', v)}
            />
            <Label>Remove Role on React Again</Label>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-3">Role Options</h4>
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={option.id} className="p-3 border rounded-md space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Option {index + 1}</span>
                    <Button size="sm" variant="destructive" onClick={() => removeOption(index)}>
                      Remove
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select onValueChange={(v) => setValue(`options.${index}.roleId`, v)} defaultValue={option.roleId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Emoji (e.g., 🎮)"
                      defaultValue={option.emoji ?? ''}
                      onChange={(e) => setValue(`options.${index}.emoji`, e.target.value)}
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => appendOption({ id: crypto.randomUUID(), type: 'button', label: null, emoji: null, roleId: '', roleName: '', description: null, order: options.length })}
                className="w-full"
              >
                Add Role Option
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-3">Embed Settings</h4>
            <div className="space-y-2">
              <Label htmlFor="embedTitle">Embed Title</Label>
              <Input id="embedTitle" {...register('embed.title')} placeholder="Reaction Roles" />
            </div>
            <div className="space-y-2 mt-2">
              <Label htmlFor="embedDescription">Embed Description</Label>
              <Textarea id="embedDescription" {...register('embed.description')} placeholder="Select your roles..." rows={3} />
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
            <CardDescription>Live preview of your reaction role panel</CardDescription>
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
              <div className="pt-2 flex flex-wrap gap-2">
                {watch('options')?.map((opt) => (
                  <button
                    key={opt.id}
                    className="bg-[#4E5058] hover:bg-[#5C5E66] text-white px-3 py-1.5 rounded flex items-center gap-1.5 text-sm"
                  >
                    {opt.emoji && <span>{opt.emoji}</span>}
                    {opt.label || roles.find((r) => r.id === opt.roleId)?.name || 'Role'}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

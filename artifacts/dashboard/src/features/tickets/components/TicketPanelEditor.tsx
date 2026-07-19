import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ChevronLeft } from 'lucide-react'
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
    <div className="space-y-6">
      {/* Back button + title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h2 className="text-xl font-semibold">{panel ? 'Edit Ticket Panel' : 'New Ticket Panel'}</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left — form */}
        <div className="lg:col-span-3 space-y-5">

          {/* Basic info */}
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Panel Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Panel Name *</Label>
                <Input id="name" {...register('name')} placeholder="Support Tickets" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register('description')} placeholder="Get help from our support team" rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select onValueChange={(v) => setValue('status', v as 'draft' | 'active' | 'archived')} defaultValue={watch('status')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft — not active yet</SelectItem>
                    <SelectItem value="active">Active — accepting tickets</SelectItem>
                    <SelectItem value="archived">Archived — closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Routing */}
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Routing</CardTitle>
              <CardDescription>Where the panel goes and where tickets are created</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetChannelId">Panel Channel</Label>
                <Select onValueChange={(v) => setValue('targetChannelId', v)} defaultValue={watch('targetChannelId') ?? undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a channel…" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>#{ch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">The bot will post the ticket button here.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Ticket Category</Label>
                <Select onValueChange={(v) => setValue('categoryId', v)} defaultValue={watch('categoryId') ?? undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category…" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">New ticket channels are created inside this category.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="logChannelId">Log Channel</Label>
                <Select onValueChange={(v) => setValue('logChannelId', v)} defaultValue={watch('logChannelId') ?? undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a channel…" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>#{ch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Support roles */}
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Support Roles</CardTitle>
              <CardDescription>These roles can see and manage all tickets</CardDescription>
            </CardHeader>
            <CardContent>
              {roles.filter(r => !r.managed && r.name !== '@everyone').length === 0 ? (
                <p className="text-sm text-muted-foreground">No roles found.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {roles.filter(r => !r.managed && r.name !== '@everyone').map((role) => (
                    <div key={role.id} className="flex items-center gap-3 py-1">
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
              )}
            </CardContent>
          </Card>

          {/* Ticket settings */}
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Ticket Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ticketLimit">Tickets per User</Label>
                  <Input id="ticketLimit" type="number" {...register('ticketLimit')} min={1} max={10} />
                  <p className="text-xs text-muted-foreground">Max open tickets per member</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticketPrefix">Channel Prefix</Label>
                  <Input id="ticketPrefix" {...register('ticketPrefix')} placeholder="ticket" />
                  <p className="text-xs text-muted-foreground">e.g. <code>ticket-username</code></p>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Save Transcripts</p>
                    <p className="text-xs text-muted-foreground">Save ticket history when closed</p>
                  </div>
                  <Switch
                    checked={watch('transcriptEnabled')}
                    onCheckedChange={(v) => setValue('transcriptEnabled', v)}
                  />
                </div>
                {watch('transcriptEnabled') && (
                  <div className="space-y-2">
                    <Label htmlFor="transcriptChannelId">Transcript Channel</Label>
                    <Select onValueChange={(v) => setValue('transcriptChannelId', v)} defaultValue={watch('transcriptChannelId') ?? undefined}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a channel…" />
                      </SelectTrigger>
                      <SelectContent>
                        {channels.map((ch) => (
                          <SelectItem key={ch.id} value={ch.id}>#{ch.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Require Close Reason</p>
                    <p className="text-xs text-muted-foreground">Staff must enter a reason to close</p>
                  </div>
                  <Switch
                    checked={watch('closeReasonRequired')}
                    onCheckedChange={(v) => setValue('closeReasonRequired', v)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="closeMessage">Close Message</Label>
                <Textarea id="closeMessage" {...register('closeMessage')} placeholder="Thank you for contacting support. This ticket will now be closed." rows={2} />
              </div>
            </CardContent>
          </Card>

          {/* Panel appearance */}
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Panel Appearance</CardTitle>
              <CardDescription>How the embed and button look in Discord</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="buttonLabel">Button Label</Label>
                  <Input id="buttonLabel" {...register('button.label')} placeholder="Create Ticket" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buttonEmoji">Emoji</Label>
                  <Input id="buttonEmoji" {...register('button.emoji')} placeholder="🎫" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="buttonStyle">Button Color</Label>
                <Select onValueChange={(v) => setValue('button.style', v as TicketPanelButtonStyle)} defaultValue={buttonStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary (Blue)</SelectItem>
                    <SelectItem value="secondary">Secondary (Gray)</SelectItem>
                    <SelectItem value="success">Success (Green)</SelectItem>
                    <SelectItem value="danger">Danger (Red)</SelectItem>
                    <SelectItem value="blurple">Blurple (Discord)</SelectItem>
                    <SelectItem value="grey">Grey</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="embedTitle">Embed Title</Label>
                <Input id="embedTitle" {...register('embed.title')} placeholder="Support Tickets" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="embedDescription">Embed Description</Label>
                <Textarea id="embedDescription" {...register('embed.description')} placeholder="Click the button below to open a support ticket." rows={3} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="embedColor">Embed Color</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={embedColor || '#5865F2'}
                      onChange={(e) => setValue('embed.color', e.target.value)}
                      className="h-9 w-12 rounded border border-input cursor-pointer"
                    />
                    <Input id="embedColor" {...register('embed.color')} placeholder="#5865F2" className="font-mono" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="embedFooter">Embed Footer</Label>
                  <Input id="embedFooter" {...register('embed.footer')} placeholder="United Bunnies" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleSubmit(onSubmit)} disabled={loading}>
              {loading ? 'Saving…' : panel ? 'Save Changes' : 'Create Panel'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>

        {/* Right — live preview + tips */}
        <div className="lg:col-span-2 space-y-4">
          {/* Discord preview — always visible */}
          <Card className="border-border/60 bg-background/70 backdrop-blur sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Discord Preview</CardTitle>
              <CardDescription>Live preview of your panel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-[#36393f] rounded-lg p-4 space-y-3">
                <div className="border-l-4 pl-3 py-1" style={{ borderColor: embedColor || '#5865F2' }}>
                  {embedTitle && <h4 className="font-semibold text-white text-sm">{embedTitle}</h4>}
                  {embedDescription && (
                    <p className="text-gray-300 text-xs mt-1 whitespace-pre-wrap">{embedDescription}</p>
                  )}
                  {embedFooter && (
                    <p className="text-gray-400 text-[11px] mt-2">{embedFooter}</p>
                  )}
                </div>
                <div className="pt-1">
                  <button className={`${getButtonColors(buttonStyle)} text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium`}>
                    {buttonEmoji && <span>{buttonEmoji}</span>}
                    {buttonLabel || 'Create Ticket'}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How it works */}
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">How it works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              {[
                ['1', 'Set the panel to Active and pick a channel.'],
                ['2', 'Click Deploy Panel to post the embed to Discord.'],
                ['3', 'Members click the button to open a private ticket channel.'],
                ['4', 'Your support roles can see and respond in the ticket channel.'],
                ['5', 'Staff close the ticket — a transcript is saved if enabled.'],
              ].map(([n, text]) => (
                <div key={n} className="flex gap-2">
                  <span className="text-primary font-bold shrink-0">{n}.</span>
                  <p>{text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

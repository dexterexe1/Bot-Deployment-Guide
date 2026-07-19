import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Edit2, Save, Copy, Zap, X, MessageSquare, Hash, AtSign, ChevronDown, ChevronUp } from 'lucide-react'
import { BunnyMascot } from '@/components/BunnyMascot'
import { apiRequest, isApiError } from '@/lib/api'
import { toast } from 'sonner'

export const Route = createFileRoute('/_app/guilds/$guildId/custom-commands')({
  component: GuildCustomCommandsRoute,
})

interface CustomCommand {
  id: string
  name: string
  aliases?: string[]
  response: string
  responseType?: 'text' | 'embed' | 'dm'
  embed?: {
    color?: string
    title?: string
    footer?: string
    imageUrl?: string
  }
  description?: string
  enabled: boolean
  cooldown?: number
  permission?: string
  deleteInvoke?: boolean
  deleteResponseAfter?: number
  allowedChannelIds?: string[]
  requiredRoleIds?: string[]
  ignoredRoleIds?: string[]
}

interface GuildResource {
  channels: { id: string; name: string; type: number }[]
  roles: { id: string; name: string; color: number; managed?: boolean }[]
}

const VARIABLE_EXAMPLES = [
  { variable: '{user}', description: "Mentions the user who ran the command" },
  { variable: '{user.name}', description: "User's display name" },
  { variable: '{user.id}', description: "User's Discord ID" },
  { variable: '{channel}', description: 'Mentions the current channel' },
  { variable: '{channel:name}', description: 'Current channel name' },
  { variable: '{guild}', description: 'Server name' },
  { variable: '{guild.id}', description: 'Server ID' },
  { variable: '{membercount}', description: 'Total member count' },
  { variable: '{random}', description: 'Random number 0–100' },
  { variable: '{random:1:10}', description: 'Random number in range' },
  { variable: '{time}', description: 'Current time (UTC)' },
  { variable: '{date}', description: 'Current date (UTC)' },
  { variable: '{choose:a|b|c}', description: 'Pick one randomly' },
  { variable: '{args}', description: 'Text after the command' },
]

const EMPTY_CMD: Partial<CustomCommand> = {
  name: '', aliases: [], response: '', responseType: 'text',
  description: '', enabled: true, cooldown: 0, permission: 'everyone',
  deleteInvoke: false, deleteResponseAfter: 0,
  allowedChannelIds: [], requiredRoleIds: [], ignoredRoleIds: [],
  embed: { color: '#5865F2', title: '', footer: '', imageUrl: '' },
}

function GuildCustomCommandsRoute() {
  const { guildId } = Route.useParams()
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<CustomCommand>>({})
  const [showNew, setShowNew] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [search, setSearch] = useState('')

  const { data: commands = [], isLoading } = useQuery<CustomCommand[]>({
    queryKey: ['custom-commands', guildId],
    queryFn: async () => {
      const r = await apiRequest<{ config: { moduleSettings?: Record<string, unknown> } }>(`/guilds/${guildId}/bot`)
      if (isApiError(r)) return []
      const raw = r.data.config.moduleSettings?.customCommands
      return Array.isArray(raw) ? (raw as CustomCommand[]) : []
    },
  })

  const { data: resources } = useQuery<GuildResource>({
    queryKey: ['guild-resources', guildId],
    queryFn: async () => {
      const r = await apiRequest<GuildResource>(`/guilds/${guildId}/resources`)
      if (isApiError(r)) return { channels: [], roles: [] }
      return r.data
    },
  })

  const textChannels = (resources?.channels ?? []).filter(c => c.type === 0)
  const manageableRoles = (resources?.roles ?? []).filter(r => !r.managed && r.name !== '@everyone')

  const saveMutation = useMutation({
    mutationFn: async (newCommands: CustomCommand[]) => {
      const r = await apiRequest(`/guilds/${guildId}/bot/settings`, {
        method: 'PATCH',
        body: JSON.stringify({ key: 'customCommands', value: newCommands }),
      })
      if (isApiError(r)) throw new Error(r.error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-commands', guildId] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const handleCreate = () => {
    if (!editingData.name?.trim() || !editingData.response?.trim()) {
      toast.error('Command name and response are required')
      return
    }
    const aliases = editingData.aliases
      ? editingData.aliases.filter(Boolean)
      : []
    const newCmd: CustomCommand = {
      id: crypto.randomUUID(),
      name: editingData.name.replace(/\s+/g, '-').toLowerCase(),
      aliases,
      response: editingData.response,
      responseType: editingData.responseType || 'text',
      embed: editingData.embed,
      description: editingData.description || '',
      enabled: true,
      cooldown: editingData.cooldown || 0,
      permission: editingData.permission,
      deleteInvoke: editingData.deleteInvoke || false,
      deleteResponseAfter: editingData.deleteResponseAfter || 0,
      allowedChannelIds: editingData.allowedChannelIds || [],
      requiredRoleIds: editingData.requiredRoleIds || [],
      ignoredRoleIds: editingData.ignoredRoleIds || [],
    }
    saveMutation.mutate([...commands, newCmd], {
      onSuccess: () => {
        setShowNew(false)
        setEditingData({})
        setShowAdvanced(false)
        toast.success('Command created')
      },
    })
  }

  const handleSaveEdit = () => {
    if (!editingId || !editingData.name?.trim() || !editingData.response?.trim()) {
      toast.error('Command name and response are required')
      return
    }
    const updated = commands.map(c =>
      c.id === editingId ? ({ ...c, ...editingData } as CustomCommand) : c
    )
    saveMutation.mutate(updated, {
      onSuccess: () => {
        setEditingId(null)
        setEditingData({})
        setShowAdvanced(false)
        toast.success('Command updated')
      },
    })
  }

  const handleDelete = (id: string) => {
    saveMutation.mutate(commands.filter(c => c.id !== id), {
      onSuccess: () => toast.success('Command deleted'),
    })
  }

  const handleToggleEnabled = (cmd: CustomCommand) => {
    const updated = commands.map(c => c.id === cmd.id ? { ...c, enabled: !c.enabled } : c)
    saveMutation.mutate(updated)
  }

  const copyVariable = (v: string) => { navigator.clipboard.writeText(v); toast.success(`Copied ${v}`) }

  const setAliasesFromString = (val: string) => {
    const aliases = val.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    setEditingData(d => ({ ...d, aliases }))
  }

  const toggleChannel = (channelId: string) => {
    const cur = editingData.allowedChannelIds ?? []
    setEditingData(d => ({
      ...d,
      allowedChannelIds: cur.includes(channelId) ? cur.filter(id => id !== channelId) : [...cur, channelId]
    }))
  }
  const toggleRequiredRole = (roleId: string) => {
    const cur = editingData.requiredRoleIds ?? []
    setEditingData(d => ({
      ...d,
      requiredRoleIds: cur.includes(roleId) ? cur.filter(id => id !== roleId) : [...cur, roleId]
    }))
  }
  const toggleIgnoredRole = (roleId: string) => {
    const cur = editingData.ignoredRoleIds ?? []
    setEditingData(d => ({
      ...d,
      ignoredRoleIds: cur.includes(roleId) ? cur.filter(id => id !== roleId) : [...cur, roleId]
    }))
  }

  const filteredCommands = commands.filter(c =>
    !search || c.name.includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <BunnyMascot size="lg" animated />
        <div className="animate-pulse text-muted-foreground">Loading custom commands…</div>
      </div>
    )
  }

  const isEditing = showNew || !!editingId

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Custom Commands</h1>
            <p className="text-sm text-muted-foreground">
              {commands.length} command{commands.length !== 1 ? 's' : ''} · Create custom bot commands with variables, embeds, cooldowns, and restrictions.
            </p>
          </div>
          {!isEditing && (
            <Button onClick={() => { setShowNew(true); setEditingId(null); setEditingData({ ...EMPTY_CMD }); setShowAdvanced(false) }}>
              <Plus className="mr-2 h-4 w-4" />
              New Command
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">

            {/* ── Create / Edit Form ── */}
            {isEditing && (
              <Card className="border-border/60 bg-background/70 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{showNew ? 'Create Command' : 'Edit Command'}</CardTitle>
                      <CardDescription>Configure your custom command settings</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setShowNew(false); setEditingId(null); setEditingData({}); setShowAdvanced(false) }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">

                  {/* Basic */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Command Name *</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-mono text-sm">{editingData.permission === 'everyone' || !editingData.permission ? '?' : '?'}</span>
                        <Input
                          value={editingData.name || ''}
                          onChange={e => setEditingData(d => ({ ...d, name: e.target.value }))}
                          placeholder="hello"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Aliases <span className="text-muted-foreground font-normal text-xs">(comma-separated)</span></Label>
                      <Input
                        value={(editingData.aliases ?? []).join(', ')}
                        onChange={e => setAliasesFromString(e.target.value)}
                        placeholder="hi, hey, greet"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                    <Input
                      value={editingData.description || ''}
                      onChange={e => setEditingData(d => ({ ...d, description: e.target.value }))}
                      placeholder="What does this command do?"
                    />
                  </div>

                  <Separator />

                  {/* Response type */}
                  <div className="space-y-3">
                    <Label>Response Type</Label>
                    <div className="flex gap-2">
                      {(['text', 'embed', 'dm'] as const).map(type => (
                        <button
                          key={type}
                          onClick={() => setEditingData(d => ({ ...d, responseType: type }))}
                          className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                            editingData.responseType === type
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border/60 bg-background/40 text-muted-foreground hover:border-border hover:text-foreground'
                          }`}
                        >
                          {type === 'text' && '💬 Text'}
                          {type === 'embed' && '📦 Embed'}
                          {type === 'dm' && '📩 DM User'}
                        </button>
                      ))}
                    </div>
                    {editingData.responseType === 'dm' && (
                      <p className="text-xs text-muted-foreground">The response will be sent as a DM to the user who ran the command.</p>
                    )}
                  </div>

                  {/* Response text */}
                  <div className="space-y-2">
                    <Label>Response *</Label>
                    <Textarea
                      value={editingData.response || ''}
                      onChange={e => setEditingData(d => ({ ...d, response: e.target.value }))}
                      placeholder={editingData.responseType === 'embed' ? 'Embed body text — use variables like {user}' : 'Hi there, {user}!'}
                      rows={4}
                      className="font-mono text-sm"
                    />
                  </div>

                  {/* Embed builder */}
                  {editingData.responseType === 'embed' && (
                    <Card className="border-dashed border-primary/30 bg-primary/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-primary">Embed Builder</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-xs">Embed Title</Label>
                            <Input
                              value={editingData.embed?.title || ''}
                              onChange={e => setEditingData(d => ({ ...d, embed: { ...d.embed, title: e.target.value } }))}
                              placeholder="Hello, {user.name}!"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Embed Color</Label>
                            <div className="flex gap-2 items-center">
                              <input
                                type="color"
                                value={editingData.embed?.color || '#5865F2'}
                                onChange={e => setEditingData(d => ({ ...d, embed: { ...d.embed, color: e.target.value } }))}
                                className="h-9 w-12 rounded border border-input cursor-pointer"
                              />
                              <Input
                                value={editingData.embed?.color || '#5865F2'}
                                onChange={e => setEditingData(d => ({ ...d, embed: { ...d.embed, color: e.target.value } }))}
                                className="font-mono text-xs"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Footer Text</Label>
                          <Input
                            value={editingData.embed?.footer || ''}
                            onChange={e => setEditingData(d => ({ ...d, embed: { ...d.embed, footer: e.target.value } }))}
                            placeholder="United Bunnies"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Image URL <span className="text-muted-foreground font-normal">(optional thumbnail)</span></Label>
                          <Input
                            value={editingData.embed?.imageUrl || ''}
                            onChange={e => setEditingData(d => ({ ...d, embed: { ...d.embed, imageUrl: e.target.value } }))}
                            placeholder="https://example.com/image.png"
                          />
                        </div>

                        {/* Live Discord preview */}
                        <div className="rounded-lg bg-[#36393f] p-3 mt-2">
                          <div className="border-l-4 pl-3 py-1" style={{ borderColor: editingData.embed?.color || '#5865F2' }}>
                            {editingData.embed?.title && <p className="text-white text-sm font-semibold">{editingData.embed.title}</p>}
                            {editingData.response && <p className="text-gray-300 text-xs mt-1 whitespace-pre-wrap">{editingData.response}</p>}
                            {editingData.embed?.footer && <p className="text-gray-400 text-[11px] mt-2">{editingData.embed.footer}</p>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Separator />

                  {/* Core options */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Required Permission</Label>
                      <Select
                        value={editingData.permission || 'everyone'}
                        onValueChange={v => setEditingData(d => ({ ...d, permission: v === 'everyone' ? undefined : v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="everyone">Everyone</SelectItem>
                          <SelectItem value="Moderator">Moderator</SelectItem>
                          <SelectItem value="Administrator">Administrator</SelectItem>
                          <SelectItem value="Server Owner">Server Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cooldown (seconds)</Label>
                      <Input
                        type="number"
                        value={editingData.cooldown ?? ''}
                        onChange={e => setEditingData(d => ({ ...d, cooldown: Number(e.target.value) }))}
                        placeholder="0"
                        min={0}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <Switch
                        checked={editingData.deleteInvoke || false}
                        onCheckedChange={v => setEditingData(d => ({ ...d, deleteInvoke: v }))}
                      />
                      <span className="text-sm">Delete invoking message</span>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <Label>Auto-delete response after <span className="text-muted-foreground font-normal">(seconds, 0 = never)</span></Label>
                    <Input
                      type="number"
                      value={editingData.deleteResponseAfter ?? 0}
                      onChange={e => setEditingData(d => ({ ...d, deleteResponseAfter: Number(e.target.value) }))}
                      min={0}
                      max={3600}
                      className="max-w-[160px]"
                    />
                  </div>

                  {/* Advanced restrictions toggle */}
                  <button
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                    onClick={() => setShowAdvanced(v => !v)}
                  >
                    {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showAdvanced ? 'Hide' : 'Show'} channel &amp; role restrictions
                  </button>

                  {showAdvanced && (
                    <div className="space-y-5 border-l-2 border-primary/20 pl-4">

                      {/* Channel restrictions */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <Hash className="h-3.5 w-3.5" />
                          Allowed Channels
                          <span className="text-muted-foreground font-normal text-xs">(empty = all channels)</span>
                        </Label>
                        {textChannels.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No channels found. Make sure the bot has access.</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                            {textChannels.map(ch => (
                              <label key={ch.id} className="flex items-center gap-2 cursor-pointer select-none rounded px-2 py-1 hover:bg-white/5">
                                <input
                                  type="checkbox"
                                  checked={(editingData.allowedChannelIds ?? []).includes(ch.id)}
                                  onChange={() => toggleChannel(ch.id)}
                                  className="rounded border-border"
                                />
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Hash className="h-2.5 w-2.5" />{ch.name}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                        {(editingData.allowedChannelIds?.length ?? 0) > 0 && (
                          <p className="text-xs text-primary">Command only works in {editingData.allowedChannelIds?.length} selected channel(s).</p>
                        )}
                      </div>

                      {/* Role restrictions */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5">
                            <AtSign className="h-3.5 w-3.5" />
                            Required Roles
                            <span className="text-muted-foreground font-normal text-xs">(must have any)</span>
                          </Label>
                          <div className="space-y-1 max-h-36 overflow-y-auto">
                            {manageableRoles.map(role => (
                              <label key={role.id} className="flex items-center gap-2 cursor-pointer select-none rounded px-2 py-1 hover:bg-white/5">
                                <input
                                  type="checkbox"
                                  checked={(editingData.requiredRoleIds ?? []).includes(role.id)}
                                  onChange={() => toggleRequiredRole(role.id)}
                                  className="rounded border-border"
                                />
                                <span className="text-xs">{role.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5">
                            <AtSign className="h-3.5 w-3.5" />
                            Ignored Roles
                            <span className="text-muted-foreground font-normal text-xs">(can't use)</span>
                          </Label>
                          <div className="space-y-1 max-h-36 overflow-y-auto">
                            {manageableRoles.map(role => (
                              <label key={role.id} className="flex items-center gap-2 cursor-pointer select-none rounded px-2 py-1 hover:bg-white/5">
                                <input
                                  type="checkbox"
                                  checked={(editingData.ignoredRoleIds ?? []).includes(role.id)}
                                  onChange={() => toggleIgnoredRole(role.id)}
                                  className="rounded border-border"
                                />
                                <span className="text-xs">{role.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button onClick={showNew ? handleCreate : handleSaveEdit} disabled={saveMutation.isPending}>
                      <Save className="mr-2 h-4 w-4" />
                      {saveMutation.isPending ? 'Saving…' : showNew ? 'Create' : 'Save'}
                    </Button>
                    <Button variant="ghost" onClick={() => { setShowNew(false); setEditingId(null); setEditingData({}); setShowAdvanced(false) }}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search */}
            {!isEditing && commands.length > 0 && (
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search commands…"
                className="bg-background/60"
              />
            )}

            {/* Empty state */}
            {commands.length === 0 && !showNew && (
              <Card className="border-dashed border-border/60">
                <CardContent className="py-16 text-center">
                  <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium">No custom commands yet</p>
                  <p className="text-muted-foreground text-sm mt-1">Click <strong>New Command</strong> to create your first one.</p>
                  <Button className="mt-4" onClick={() => { setShowNew(true); setEditingData({ ...EMPTY_CMD }) }}>
                    <Plus className="mr-2 h-4 w-4" />New Command
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Command list */}
            {!isEditing && filteredCommands.map(cmd => (
              <Card
                key={cmd.id}
                className={`border-border/60 bg-background/70 backdrop-blur transition-opacity ${cmd.enabled ? '' : 'opacity-60'}`}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-primary">?{cmd.name}</span>
                      {cmd.aliases?.map(a => (
                        <Badge key={a} variant="outline" className="text-[10px] font-mono">?{a}</Badge>
                      ))}
                      {cmd.responseType && cmd.responseType !== 'text' && (
                        <Badge variant="secondary" className="text-[10px]">
                          {cmd.responseType === 'embed' ? '📦 embed' : '📩 dm'}
                        </Badge>
                      )}
                      {cmd.permission && cmd.permission !== 'everyone' && (
                        <Badge variant="outline" className="text-[10px]">{cmd.permission}</Badge>
                      )}
                      {(cmd.cooldown ?? 0) > 0 && (
                        <Badge variant="secondary" className="text-[10px]">{cmd.cooldown}s cooldown</Badge>
                      )}
                      {cmd.deleteInvoke && (
                        <Badge variant="secondary" className="text-[10px]">deletes invoke</Badge>
                      )}
                      {(cmd.allowedChannelIds?.length ?? 0) > 0 && (
                        <Badge variant="outline" className="text-[10px] border-blue-500/40 text-blue-400">{cmd.allowedChannelIds!.length} channel(s)</Badge>
                      )}
                    </div>
                    {cmd.description && <p className="text-xs text-muted-foreground">{cmd.description}</p>}
                    <p className="text-xs font-mono text-muted-foreground/70 line-clamp-2">{cmd.response}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-3 shrink-0">
                    <Switch checked={cmd.enabled} onCheckedChange={() => handleToggleEnabled(cmd)} className="mr-1" />
                    <Button variant="ghost" size="icon" onClick={() => { setEditingId(cmd.id); setEditingData({ ...cmd }); setShowNew(false) }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cmd.id)} disabled={saveMutation.isPending}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}

            {!isEditing && search && filteredCommands.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No commands match "{search}"</p>
            )}
          </div>

          {/* Sidebar — variables + tips */}
          <div className="space-y-4">
            <Card className="border-border/60 bg-background/70 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-primary" />
                  Variables
                </CardTitle>
                <CardDescription className="text-xs">Click to copy into your response</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {VARIABLE_EXAMPLES.map(v => (
                  <div key={v.variable} className="flex items-center justify-between gap-2 rounded-md border border-border/40 p-2">
                    <div>
                      <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{v.variable}</code>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{v.description}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyVariable(v.variable)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-background/70 backdrop-blur">
              <CardHeader><CardTitle className="text-sm">Response Types</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                <div><p className="font-medium text-foreground mb-0.5">💬 Text</p><p>Plain text message. Supports all variables.</p></div>
                <div><p className="font-medium text-foreground mb-0.5">📦 Embed</p><p>Rich Discord embed with color, title, and footer. Great for formatted info commands.</p></div>
                <div><p className="font-medium text-foreground mb-0.5">📩 DM User</p><p>Sends the response privately to whoever runs the command. Good for sensitive info.</p></div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-background/70 backdrop-blur">
              <CardHeader><CardTitle className="text-sm">Tips</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p>Use <strong>aliases</strong> so members can trigger the same command with different names.</p>
                <p>Use <strong>Allowed Channels</strong> to limit a command to only work in #bot-commands.</p>
                <p>Use <strong>Required Roles</strong> to make staff-only commands that members can't access.</p>
                <p>Set <strong>Auto-delete</strong> to keep your channels clean — the bot's response disappears after a few seconds.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

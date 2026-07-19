import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Edit2, Save, Copy, Zap, X } from 'lucide-react'
import { BunnyMascot } from '@/components/BunnyMascot'
import { apiRequest, isApiError } from '@/lib/api'
import { toast } from 'sonner'

export const Route = createFileRoute('/_app/guilds/$guildId/custom-commands')({
  component: GuildCustomCommandsRoute,
})

interface CustomCommand {
  id: string
  name: string
  response: string
  description?: string
  enabled: boolean
  cooldown?: number
  permission?: string
  deleteInvoke?: boolean
}

const VARIABLE_EXAMPLES = [
  { variable: '{user}', description: "Mentions the user who ran the command" },
  { variable: '{user.name}', description: "User's display name" },
  { variable: '{channel}', description: 'Mentions the current channel' },
  { variable: '{channel:name}', description: 'Current channel name' },
  { variable: '{guild}', description: 'Server name' },
  { variable: '{random}', description: 'Random number 0–100' },
]

function GuildCustomCommandsRoute() {
  const { guildId } = Route.useParams()
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<CustomCommand>>({})
  const [showNew, setShowNew] = useState(false)

  /* ── fetch commands from bot moduleSettings ── */
  const { data: commands = [], isLoading } = useQuery<CustomCommand[]>({
    queryKey: ['custom-commands', guildId],
    queryFn: async () => {
      const r = await apiRequest<{ config: { moduleSettings?: Record<string, unknown> } }>(
        `/guilds/${guildId}/bot`,
      )
      if (isApiError(r)) return []
      const raw = r.data.config.moduleSettings?.customCommands
      return Array.isArray(raw) ? (raw as CustomCommand[]) : []
    },
  })

  /* ── save full array back to bot settings ── */
  const saveMutation = useMutation({
    mutationFn: async (newCommands: CustomCommand[]) => {
      const r = await apiRequest(`/guilds/${guildId}/bot/settings`, {
        method: 'PATCH',
        body: JSON.stringify({ key: 'customCommands', value: newCommands }),
      })
      if (isApiError(r)) throw new Error(r.error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-commands', guildId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleCreate = () => {
    if (!editingData.name || !editingData.response) return
    const newCmd: CustomCommand = {
      id: crypto.randomUUID(),
      name: editingData.name.replace(/\s+/g, '-').toLowerCase(),
      response: editingData.response,
      description: editingData.description || '',
      enabled: true,
      cooldown: editingData.cooldown || 0,
      permission: editingData.permission,
      deleteInvoke: editingData.deleteInvoke || false,
    }
    saveMutation.mutate([...commands, newCmd], {
      onSuccess: () => {
        setShowNew(false)
        setEditingData({})
        toast.success('Command created')
      },
    })
  }

  const handleSaveEdit = () => {
    if (!editingId || !editingData.name || !editingData.response) return
    const updated = commands.map((c) =>
      c.id === editingId ? ({ ...c, ...editingData } as CustomCommand) : c,
    )
    saveMutation.mutate(updated, {
      onSuccess: () => {
        setEditingId(null)
        setEditingData({})
        toast.success('Command updated')
      },
    })
  }

  const handleDelete = (id: string) => {
    saveMutation.mutate(
      commands.filter((c) => c.id !== id),
      { onSuccess: () => toast.success('Command deleted') },
    )
  }

  const handleToggleEnabled = (cmd: CustomCommand) => {
    const updated = commands.map((c) =>
      c.id === cmd.id ? { ...c, enabled: !c.enabled } : c,
    )
    saveMutation.mutate(updated)
  }

  const copyVariable = (v: string) => {
    navigator.clipboard.writeText(v)
    toast.success(`Copied ${v}`)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <BunnyMascot size="lg" animated />
        <div className="animate-pulse text-muted-foreground">Loading custom commands…</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Custom Commands</h1>
            <p className="text-sm text-muted-foreground">
              Create custom bot commands with variables, cooldowns, and permission controls.
            </p>
          </div>
          <Button
            onClick={() => {
              setShowNew(true)
              setEditingId(null)
              setEditingData({ name: '', response: '', description: '', enabled: true })
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Command
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {/* New/Edit Form */}
            {(showNew || editingId) && (
              <Card className="border-border/60 bg-background/70 backdrop-blur">
                <CardHeader>
                  <CardTitle>{showNew ? 'Create Command' : 'Edit Command'}</CardTitle>
                  <CardDescription>Configure your custom command</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Command Name</Label>
                    <div className="flex gap-2 items-center">
                      <span className="text-muted-foreground font-mono text-sm">?</span>
                      <Input
                        id="name"
                        value={editingData.name || ''}
                        onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                        placeholder="e.g. hello"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="response">Response</Label>
                    <textarea
                      id="response"
                      value={editingData.response || ''}
                      onChange={(e) => setEditingData({ ...editingData, response: e.target.value })}
                      placeholder="Hi there, {user}!"
                      rows={4}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <Label htmlFor="description">Description (optional)</Label>
                      <Input
                        id="description"
                        value={editingData.description || ''}
                        onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
                        placeholder="What does this command do?"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cooldown">Cooldown (seconds)</Label>
                      <Input
                        id="cooldown"
                        type="number"
                        value={editingData.cooldown || ''}
                        onChange={(e) =>
                          setEditingData({ ...editingData, cooldown: Number(e.target.value) })
                        }
                        placeholder="0"
                        min={0}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <Label htmlFor="permission">Required Permission</Label>
                      <Select
                        value={editingData.permission || 'everyone'}
                        onValueChange={(v) =>
                          setEditingData({ ...editingData, permission: v === 'everyone' ? undefined : v })
                        }
                      >
                        <SelectTrigger id="permission">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="everyone">Everyone</SelectItem>
                          <SelectItem value="Moderator">Moderator</SelectItem>
                          <SelectItem value="Administrator">Administrator</SelectItem>
                          <SelectItem value="Server Owner">Server Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                      <Switch
                        id="deleteInvoke"
                        checked={editingData.deleteInvoke || false}
                        onCheckedChange={(v) => setEditingData({ ...editingData, deleteInvoke: v })}
                      />
                      <Label htmlFor="deleteInvoke" className="cursor-pointer">
                        Delete invoking message
                      </Label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {showNew ? (
                      <>
                        <Button onClick={handleCreate} disabled={saveMutation.isPending}>
                          <Save className="mr-2 h-4 w-4" />
                          {saveMutation.isPending ? 'Saving…' : 'Create'}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setShowNew(false)
                            setEditingData({})
                          }}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button onClick={handleSaveEdit} disabled={saveMutation.isPending}>
                          <Save className="mr-2 h-4 w-4" />
                          {saveMutation.isPending ? 'Saving…' : 'Save'}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditingId(null)
                            setEditingData({})
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty state */}
            {commands.length === 0 && !showNew && (
              <Card className="border-border/60 bg-background/70 backdrop-blur">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground text-sm">
                    No custom commands yet. Click <strong>New Command</strong> to create your first one.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Command list */}
            {commands.map((cmd) => (
              <Card
                key={cmd.id}
                className={`border-border/60 bg-background/70 backdrop-blur transition-opacity ${
                  cmd.enabled ? '' : 'opacity-60'
                }`}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-primary">?{cmd.name}</span>
                      {cmd.permission && (
                        <Badge variant="outline" className="text-[10px]">
                          {cmd.permission}
                        </Badge>
                      )}
                      {cmd.cooldown ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {cmd.cooldown}s cooldown
                        </Badge>
                      ) : null}
                      {cmd.deleteInvoke && (
                        <Badge variant="secondary" className="text-[10px]">
                          deletes invoke
                        </Badge>
                      )}
                    </div>
                    {cmd.description && (
                      <p className="text-xs text-muted-foreground">{cmd.description}</p>
                    )}
                    <p className="text-sm font-mono text-muted-foreground/80 line-clamp-2">
                      {cmd.response}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-3 shrink-0">
                    <Switch
                      checked={cmd.enabled}
                      onCheckedChange={() => handleToggleEnabled(cmd)}
                      className="mr-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingId(cmd.id)
                        setEditingData({ ...cmd })
                        setShowNew(false)
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(cmd.id)}
                      disabled={saveMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="border-border/60 bg-background/70 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Variables
                </CardTitle>
                <CardDescription>Click to copy into your response</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {VARIABLE_EXAMPLES.map((v) => (
                  <div
                    key={v.variable}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/50 p-2"
                  >
                    <div className="space-y-0.5">
                      <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {v.variable}
                      </code>
                      <p className="text-xs text-muted-foreground">{v.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => copyVariable(v.variable)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-background/70 backdrop-blur">
              <CardHeader>
                <CardTitle>Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Use <code className="text-primary text-xs bg-primary/10 px-1 py-0.5 rounded">{'{user}'}</code> to mention
                  whoever runs the command.
                </p>
                <p>
                  Set a <strong>cooldown</strong> to prevent spamming the same command back-to-back.
                </p>
                <p>
                  Restrict to <strong>Moderator</strong> or higher to keep admin commands safe.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

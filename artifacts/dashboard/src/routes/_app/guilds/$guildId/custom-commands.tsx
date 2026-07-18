import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Edit2, Save, Copy, Terminal, Zap, User, Hash, MessageSquare } from 'lucide-react'
import { BunnyMascot } from '@/components/BunnyMascot'

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
}

const INITIAL_COMMANDS: CustomCommand[] = [
  { id: '1', name: 'hello', response: 'Hi there, {user} 👋', description: 'Say hello to the user', enabled: true },
  { id: '2', name: 'ping', response: 'Pong! {latency}ms', description: 'Check bot latency', enabled: true },
  { id: '3', name: 'rules', response: 'Please read the server rules in {channel:rules}!', enabled: true, permission: 'Moderator' },
]

const VARIABLE_EXAMPLES = [
  { variable: '{user}', description: 'Mentions the user who ran the command' },
  { variable: '{user.name}', description: 'User\'s display name' },
  { variable: '{channel}', description: 'Mentions the current channel' },
  { variable: '{channel:name}', description: 'Current channel name' },
  { variable: '{guild}', description: 'Server name' },
  { variable: '{random}', description: 'Random number 0-100' },
]

function GuildCustomCommandsRoute() {
  const { guildId } = Route.useParams()
  const [commands, setCommands] = useState<CustomCommand[]>(INITIAL_COMMANDS)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<CustomCommand>>({})
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [guildId])

  const handleStartEdit = (cmd: CustomCommand) => {
    setEditingId(cmd.id)
    setEditingData({ ...cmd })
    setShowNew(false)
  }

  const handleSaveEdit = () => {
    if (!editingId || !editingData.name || !editingData.response) return
    setCommands((prev) =>
      prev.map((c) => c.id === editingId ? { ...c, ...editingData } as CustomCommand : c)
    )
    setEditingId(null)
    setEditingData({})
  }

  const handleCreate = () => {
    if (!editingData.name || !editingData.response) return
    const newCmd: CustomCommand = {
      id: Date.now().toString(),
      name: editingData.name,
      response: editingData.response,
      description: editingData.description || '',
      enabled: true,
      cooldown: editingData.cooldown || 0,
      permission: editingData.permission,
    }
    setCommands((prev) => [...prev, newCmd])
    setShowNew(false)
    setEditingData({})
  }

  const handleDelete = (id: string) => {
    setCommands((prev) => prev.filter((c) => c.id !== id))
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <BunnyMascot size="lg" animated />
        <div className="animate-pulse text-muted-foreground">Loading custom commands...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Custom Commands</h1>
            <p className="text-sm text-muted-foreground">Create custom bot commands like Dyno, with variables and permissions</p>
          </div>
          <Button
            onClick={() => {
              setShowNew(true)
              setEditingId(null)
              setEditingData({ name: '', response: '', description: '' })
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
                  <CardTitle>{showNew ? 'Create New Command' : 'Edit Command'}</CardTitle>
                  <CardDescription>Configure your custom command</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Command Name (without prefix)</Label>
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
                      placeholder="e.g. Hi there, {user}!"
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
                      <Label htmlFor="cooldown">Cooldown (seconds, optional)</Label>
                      <Input
                        id="cooldown"
                        type="number"
                        value={editingData.cooldown || ''}
                        onChange={(e) => setEditingData({ ...editingData, cooldown: Number(e.target.value) })}
                        placeholder="5"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {showNew ? (
                      <>
                        <Button onClick={handleCreate}><Save className="mr-2 h-4 w-4" /> Create</Button>
                        <Button variant="ghost" onClick={() => { setShowNew(false); setEditingData({}) }}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button onClick={handleSaveEdit}><Save className="mr-2 h-4 w-4" /> Save</Button>
                        <Button variant="ghost" onClick={() => { setEditingId(null); setEditingData({}) }}>Cancel</Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Command List */}
            {commands.map((cmd) => (
              <Card key={cmd.id} className="border-border/60 bg-background/70 backdrop-blur">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-primary">?{cmd.name}</span>
                      {cmd.permission && (
                        <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground uppercase">
                          {cmd.permission}
                        </span>
                      )}
                    </div>
                    {cmd.description && <p className="text-xs text-muted-foreground">{cmd.description}</p>}
                    <p className="text-sm font-mono text-muted-foreground/80 line-clamp-2">{cmd.response}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleStartEdit(cmd)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cmd.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <Card className="border-border/60 bg-background/70 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Variables
                </CardTitle>
                <CardDescription>Use these in your responses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {VARIABLE_EXAMPLES.map((v) => (
                  <div key={v.variable} className="flex items-center justify-between gap-3 rounded-md border border-border/50 p-2">
                    <div className="space-y-1">
                      <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{v.variable}</code>
                      <p className="text-xs text-muted-foreground">{v.description}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-background/70 backdrop-blur">
              <CardHeader>
                <CardTitle>Pro Tips</CardTitle>
                <CardDescription>Dyno-style commands you can build</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="rounded-md border border-border/50 p-3">
                  <p className="font-semibold text-foreground">?rules</p>
                  <p className="text-xs mt-1">Show server rules with {"{Channel}"} variable</p>
                </div>
                <div className="rounded-md border border-border/50 p-3">
                  <p className="font-semibold text-foreground">?welcome @User</p>
                  <p className="text-xs mt-1">Welcome new members with {"{User}"} and {"{Guild}"}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

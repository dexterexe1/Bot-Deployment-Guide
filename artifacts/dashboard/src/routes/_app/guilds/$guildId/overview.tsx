import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Users, Hash, Volume2, Shield, Tag, Clock, Bot, Settings,
  FileText, Ticket, TerminalSquare, Bell, UserPlus, TrendingUp,
  Music, MessageSquare, Smile, Save, Activity, ChevronRight,
} from 'lucide-react'
import { apiRequest, isApiError } from '@/lib/api'
import { toast } from 'sonner'
import { BunnyMascot } from '@/components/BunnyMascot'

export const Route = createFileRoute('/_app/guilds/$guildId/overview')({
  component: GuildOverviewRoute,
})

interface GuildResource {
  channels: { id: string; name: string; type: number }[]
  roles: { id: string; name: string; color: number; managed?: boolean }[]
  categories: { id: string; name: string }[]
}

interface BotConfig {
  modules: Record<string, boolean>
  moduleSettings?: Record<string, unknown>
}

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Australia/Sydney',
]

const MODULE_QUICK = [
  { key: 'moderation', label: 'Moderation', icon: Shield, href: 'bot' },
  { key: 'tickets', label: 'Tickets', icon: Ticket, href: 'tickets' },
  { key: 'applications', label: 'Applications', icon: FileText, href: 'applications' },
  { key: 'logging', label: 'Logging', icon: Bell, href: 'bot' },
  { key: 'welcome', label: 'Welcome', icon: UserPlus, href: 'bot' },
  { key: 'leveling', label: 'Leveling', icon: TrendingUp, href: 'bot' },
  { key: 'music', label: 'Music', icon: Music, href: 'bot' },
  { key: 'customCommands', label: 'Custom Commands', icon: TerminalSquare, href: 'custom-commands' },
  { key: 'reactionRoles', label: 'Reaction Roles', icon: Smile, href: 'bot' },
  { key: 'autoResponses', label: 'Auto Responses', icon: MessageSquare, href: 'custom-commands' },
]

function GuildOverviewRoute() {
  const { guildId } = Route.useParams()
  const qc = useQueryClient()

  const { data: resources } = useQuery<GuildResource>({
    queryKey: ['guild-resources', guildId],
    queryFn: async () => {
      const r = await apiRequest<GuildResource>(`/guilds/${guildId}/resources`)
      if (isApiError(r)) throw new Error(r.error.message)
      return r.data
    },
  })

  const { data: botData, isLoading: botLoading } = useQuery<{ config: BotConfig }>({
    queryKey: ['bot-config', guildId],
    queryFn: async () => {
      const r = await apiRequest<{ config: BotConfig }>(`/guilds/${guildId}/bot`)
      if (isApiError(r)) throw new Error(r.error.message)
      return r.data
    },
  })

  const config = botData?.config
  const ms = config?.moduleSettings as Record<string, unknown> | undefined

  // Bot settings local state
  const NONE = '__none'
  const [nickname, setNickname] = useState('')
  const [prefix, setPrefix] = useState('?')
  const [updateChannelId, setUpdateChannelId] = useState(NONE)
  const [timezone, setTimezone] = useState('UTC')
  const [managerRoleIds, setManagerRoleIds] = useState<string[]>([])

  useEffect(() => {
    if (ms) {
      setNickname((ms.nickname as string) ?? '')
      setPrefix((ms.prefix as string) ?? '?')
      setUpdateChannelId((ms.updateChannelId as string) || NONE)
      setTimezone((ms.timezone as string) ?? 'UTC')
      setManagerRoleIds((ms.managerRoleIds as string[]) ?? [])
    }
  }, [botData])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const pairs = [
        { key: 'nickname', value: nickname.trim() || null },
        { key: 'prefix', value: prefix || '?' },
        { key: 'updateChannelId', value: updateChannelId === NONE ? null : updateChannelId },
        { key: 'timezone', value: timezone },
        { key: 'managerRoleIds', value: managerRoleIds },
      ]
      await Promise.all(pairs.map(({ key, value }) =>
        apiRequest(`/guilds/${guildId}/bot/settings`, {
          method: 'PATCH',
          body: JSON.stringify({ key, value }),
        })
      ))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bot-config', guildId] })
      toast.success('Settings saved')
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const toggleRole = (roleId: string) => {
    setManagerRoleIds(prev =>
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    )
  }

  const textChannels = (resources?.channels ?? []).filter(c => c.type === 0)
  const manageableRoles = (resources?.roles ?? []).filter(r => !r.managed && r.name !== '@everyone')

  const textCount = (resources?.channels ?? []).filter(c => c.type === 0).length
  const voiceCount = (resources?.channels ?? []).filter(c => c.type === 2).length
  const roleCount = (resources?.roles ?? []).length
  const categoryCount = (resources?.categories ?? []).length

  const serverStats = [
    { label: 'Text Channels', value: textCount || '—', icon: Hash },
    { label: 'Voice Channels', value: voiceCount || '—', icon: Volume2 },
    { label: 'Roles', value: roleCount || '—', icon: Tag },
    { label: 'Categories', value: categoryCount || '—', icon: Shield },
  ]

  if (botLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <BunnyMascot size="lg" animated />
        <p className="text-sm text-muted-foreground animate-pulse">Loading server info…</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Server Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage settings and view your server at a glance.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">

          {/* Left: Server Info + Module Status */}
          <div className="space-y-5">

            {/* Server Info */}
            <Card className="border-border/60 bg-background/70 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Server Info
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {serverStats.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground">{label}</span>
                    </div>
                    <p className="text-lg font-semibold leading-none">{value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Module Status */}
            <Card className="border-border/60 bg-background/70 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  Module Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {MODULE_QUICK.map(({ key, label, icon: Icon, href }) => {
                  const enabled = config?.modules[key] ?? false
                  return (
                    <Link key={key} to={`/guilds/${guildId}/${href}`}>
                      <div className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-white/5 transition-colors cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <Icon className={`h-3.5 w-3.5 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={`text-sm ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={enabled ? 'default' : 'secondary'}
                            className={`text-[10px] ${enabled ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}`}
                          >
                            {enabled ? 'On' : 'Off'}
                          </Badge>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          {/* Right: Bot Settings */}
          <Card className="border-border/60 bg-background/70 backdrop-blur self-start">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Bot Settings
              </CardTitle>
              <CardDescription className="text-xs">Configure how the bot behaves in this server.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nickname</Label>
                  <Input
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    placeholder="United Bunnies"
                    className="bg-background/60"
                  />
                  <p className="text-[11px] text-muted-foreground">Bot's display name in this server. Leave blank to keep default.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Command Prefix</Label>
                  <Input
                    value={prefix}
                    onChange={e => setPrefix(e.target.value)}
                    placeholder="?"
                    maxLength={5}
                    className="font-mono bg-background/60 max-w-[100px]"
                  />
                  <p className="text-[11px] text-muted-foreground">Trigger prefix for bot commands (e.g. <code className="text-primary">?ban</code>).</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Manager Roles
                  <span className="ml-1 text-muted-foreground/60 normal-case font-normal">— who can manage bot settings</span>
                </Label>
                <div className="rounded-lg border border-border/50 bg-muted/10 p-3 space-y-2 max-h-40 overflow-y-auto">
                  {manageableRoles.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No roles available. Make sure the bot has permission to see roles.</p>
                  ) : manageableRoles.map(role => {
                    const color = role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#6b7280'
                    const checked = managerRoleIds.includes(role.id)
                    return (
                      <label key={role.id} className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRole(role.id)}
                          className="rounded border-border"
                        />
                        <span className="text-sm font-medium" style={{ color }}>{role.name}</span>
                      </label>
                    )
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">Selected: {managerRoleIds.length === 0 ? 'Server Owner only' : `${managerRoleIds.length} role(s)`}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Update Channel
                  <span className="ml-1 text-muted-foreground/60 normal-case font-normal">— bot sends announcements here</span>
                </Label>
                <Select value={updateChannelId} onValueChange={setUpdateChannelId}>
                  <SelectTrigger className="bg-background/60">
                    <SelectValue placeholder="Select a channel…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {textChannels.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-1.5">
                          <Hash className="h-3 w-3 opacity-50" />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="bg-background/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Used for scheduling messages and displaying timestamps.</p>
              </div>

              <Button
                className="w-full gap-2"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? 'Saving…' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="border-border/60 bg-background/70 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-xs">Recent configuration changes and bot actions in this server.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivity guildId={guildId} />
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

/* ─── Recent Activity ──────────────────────────────────────────────────────── */
interface ActivityEntry {
  id: string
  action: string
  target?: string
  user?: string
  timestamp: string
}

function RecentActivity({ guildId }: { guildId: string }) {
  const { data: logs = [], isLoading } = useQuery<ActivityEntry[]>({
    queryKey: ['guild-activity', guildId],
    queryFn: async () => {
      const r = await apiRequest<{ logs: ActivityEntry[] }>(`/guilds/${guildId}/applications/logs`)
      if (isApiError(r)) return []
      return r.data.logs ?? []
    },
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-4 justify-center">
        <BunnyMascot size="sm" animated />
        <span className="animate-pulse">Loading activity…</span>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p>No recent activity recorded yet.</p>
        <p className="text-xs mt-1">Actions like creating ticket panels, application forms, and module changes will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {logs.slice(0, 10).map(log => (
        <div key={log.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
          <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm">{log.action}</p>
            {log.target && <p className="text-xs text-muted-foreground">Target: {log.target}</p>}
          </div>
          {log.user && (
            <span className="text-xs text-muted-foreground shrink-0">by {log.user}</span>
          )}
          <span className="text-[11px] text-muted-foreground shrink-0">
            {new Date(log.timestamp).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  )
}

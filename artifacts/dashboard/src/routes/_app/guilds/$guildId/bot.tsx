import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Shield, Ticket, FileText, Bell, UserPlus, Smile,
  TrendingUp, Music, MessageSquare, TerminalSquare,
  Settings, Search, ChevronRight, ExternalLink,
  Check, X, HelpCircle, Zap, Hash,
} from 'lucide-react'
import { apiRequest, isApiError } from '@/lib/api'
import { toast } from 'sonner'
import { BunnyMascot } from '@/components/BunnyMascot'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/guilds/$guildId/bot')({
  component: GuildBotRoute,
})

/* ─── types ─────────────────────────────────────────────────────────────── */
type ModuleKey =
  | 'moderation' | 'tickets' | 'applications' | 'logging'
  | 'welcome' | 'reactionRoles' | 'leveling' | 'music'
  | 'autoResponses' | 'customCommands'

interface BotConfig {
  modules: Record<ModuleKey, boolean>
  moduleSettings?: Record<string, unknown>
}

interface Channel { id: string; name: string; type: number }
interface Role { id: string; name: string; color: number }
interface LoggingConfig {
  enabled: boolean; logChannelId: string | null
  events: Record<string, boolean>
}
interface WelcomeConfig {
  enabled: boolean; channelId: string | null
  message: string | null; sendDm: boolean; dmMessage: string | null
  autoRoleIds: string[]
}

/* ─── module definitions ─────────────────────────────────────────────────── */
interface ModuleDef {
  key: ModuleKey
  label: string
  icon: React.FC<{ className?: string }>
  description: string
  settingsType?: 'logging' | 'welcome' | 'link-custom-commands' | 'link-auto-responses' | 'moderation-info' | 'tickets-info' | 'music-info' | 'leveling-info' | 'reaction-info' | 'applications-info'
}

const MODULES: ModuleDef[] = [
  { key: 'moderation', label: 'Moderation', icon: Shield, description: 'Warnings, mutes, kicks, bans and auto-moderation.', settingsType: 'moderation-info' },
  { key: 'tickets', label: 'Tickets', icon: Ticket, description: 'Support ticket panels with staff actions.', settingsType: 'tickets-info' },
  { key: 'applications', label: 'Applications', icon: FileText, description: 'Application forms and review queue.', settingsType: 'applications-info' },
  { key: 'logging', label: 'Logging', icon: Bell, description: 'Track server activity in a log channel.', settingsType: 'logging' },
  { key: 'welcome', label: 'Welcome', icon: UserPlus, description: 'Send custom messages when members join.', settingsType: 'welcome' },
  { key: 'reactionRoles', label: 'Reaction Roles', icon: Smile, description: 'Emoji-based self-assignable roles.', settingsType: 'reaction-info' },
  { key: 'leveling', label: 'Leveling', icon: TrendingUp, description: 'XP system with level-up rewards.', settingsType: 'leveling-info' },
  { key: 'music', label: 'Music', icon: Music, description: 'Music playback in voice channels.', settingsType: 'music-info' },
  { key: 'autoResponses', label: 'Auto Responses', icon: MessageSquare, description: 'Auto-reply to trigger phrases.', settingsType: 'link-auto-responses' },
  { key: 'customCommands', label: 'Custom Commands', icon: TerminalSquare, description: 'Build your own bot commands.', settingsType: 'link-custom-commands' },
]

/* ─── command catalog (matches bot.py) ───────────────────────────────────── */
interface CommandDef {
  name: string
  syntax: string
  description: string
  example?: string
  requiresPermission?: string
  module: ModuleKey
}

interface CommandCategory {
  label: string
  commands: CommandDef[]
}

const COMMAND_CATALOG: CommandCategory[] = [
  {
    label: 'Moderation',
    commands: [
      { name: 'ban', syntax: '?ban @user [reason]', description: 'Permanently ban a user from the server.', example: '?ban @Spammer Advertising', requiresPermission: 'Ban Members', module: 'moderation' },
      { name: 'kick', syntax: '?kick @user [reason]', description: 'Remove a user from the server. They can rejoin.', example: '?kick @TrollUser Being disruptive', requiresPermission: 'Kick Members', module: 'moderation' },
      { name: 'mute', syntax: '?mute @user [duration] [reason]', description: 'Prevent a user from sending messages. Duration: 1m, 1h, 1d.', example: '?mute @User 30m Spamming', requiresPermission: 'Manage Roles', module: 'moderation' },
      { name: 'unmute', syntax: '?unmute @user', description: 'Restore a muted user\'s ability to send messages.', example: '?unmute @User', requiresPermission: 'Manage Roles', module: 'moderation' },
      { name: 'warn', syntax: '?warn @user [reason]', description: 'Issue a warning. Warnings are tracked per user.', example: '?warn @User Breaking rules', requiresPermission: 'Manage Messages', module: 'moderation' },
      { name: 'clear', syntax: '?clear [1-100]', description: 'Bulk delete messages from the current channel.', example: '?clear 20', requiresPermission: 'Manage Messages', module: 'moderation' },
      { name: 'slowmode', syntax: '?slowmode [seconds]', description: 'Set a slowmode delay in the current channel (0 to disable).', example: '?slowmode 5', requiresPermission: 'Manage Channels', module: 'moderation' },
    ],
  },
  {
    label: 'Utility',
    commands: [
      { name: 'ping', syntax: '?ping', description: 'Check the bot\'s response time and API latency.', example: '?ping', module: 'moderation' },
      { name: 'serverinfo', syntax: '?serverinfo', description: 'Display server stats: members, channels, creation date.', example: '?serverinfo', module: 'moderation' },
      { name: 'userinfo', syntax: '?userinfo [@user]', description: 'Show a user\'s account info, roles, and join date.', example: '?userinfo @Dexter', module: 'moderation' },
      { name: 'avatar', syntax: '?avatar [@user]', description: 'Get a full-size link to a user\'s avatar image.', example: '?avatar @Dexter', module: 'moderation' },
      { name: 'help', syntax: '?help [command]', description: 'List all commands, or get detail on a specific command.', example: '?help ban', module: 'moderation' },
    ],
  },
  {
    label: 'Fun',
    commands: [
      { name: 'flip', syntax: '?flip', description: 'Flip a coin — heads or tails.', example: '?flip', module: 'moderation' },
      { name: 'roll', syntax: '?roll [NdN]', description: 'Roll dice. Default is 1d6. Supports complex rolls.', example: '?roll 2d20', module: 'moderation' },
      { name: '8ball', syntax: '?8ball [question]', description: 'Ask the magic 8-ball a yes/no question.', example: '?8ball Will I pass my exam?', module: 'moderation' },
      { name: 'joke', syntax: '?joke', description: 'Get a random joke to lighten the mood.', example: '?joke', module: 'moderation' },
    ],
  },
  {
    label: 'Music',
    commands: [
      { name: 'play', syntax: '?play [song or URL]', description: 'Play a song by name or YouTube/Spotify URL.', example: '?play Never Gonna Give You Up', requiresPermission: 'Voice Channel', module: 'music' },
      { name: 'skip', syntax: '?skip', description: 'Vote to skip the current song (or skip instantly if DJ).', example: '?skip', module: 'music' },
      { name: 'queue', syntax: '?queue [page]', description: 'Show the current music queue.', example: '?queue', module: 'music' },
      { name: 'stop', syntax: '?stop', description: 'Stop playback and clear the queue.', example: '?stop', module: 'music' },
      { name: 'pause', syntax: '?pause', description: 'Pause the currently playing track.', example: '?pause', module: 'music' },
      { name: 'resume', syntax: '?resume', description: 'Resume a paused track.', example: '?resume', module: 'music' },
      { name: 'nowplaying', syntax: '?nowplaying', description: 'Show the currently playing song with progress.', example: '?nowplaying', module: 'music' },
    ],
  },
  {
    label: 'Leveling',
    commands: [
      { name: 'rank', syntax: '?rank [@user]', description: 'Show your XP rank card and progress to next level.', example: '?rank', module: 'leveling' },
      { name: 'leaderboard', syntax: '?leaderboard', description: 'Show the server\'s top 10 by XP.', example: '?leaderboard', module: 'leveling' },
    ],
  },
]

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function textChannels(channels: Channel[]) {
  return channels.filter(c => c.type === 0)
}

/* ─── settings sheets ────────────────────────────────────────────────────── */
function LoggingSettings({ guildId, onClose }: { guildId: string; onClose: () => void }) {
  const qc = useQueryClient()

  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['guild-channels', guildId],
    queryFn: async () => {
      const r = await apiRequest<{ channels: Channel[] }>(`/guilds/${guildId}/resources`)
      return isApiError(r) ? [] : r.data.channels
    },
  })

  const { data: cfg, isLoading } = useQuery<LoggingConfig>({
    queryKey: ['logging-config', guildId],
    queryFn: async () => {
      const r = await apiRequest<{ config: LoggingConfig }>(`/guilds/${guildId}/logging/config`)
      if (isApiError(r)) throw new Error(r.error.message)
      return r.data.config
    },
  })

  const [channelId, setChannelId] = useState<string>('')
  const [events, setEvents] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (cfg) {
      setChannelId(cfg.logChannelId ?? '')
      setEvents(cfg.events ?? {})
    }
  }, [cfg])

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest(`/guilds/${guildId}/logging/config`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: true, logChannelId: channelId || null, events }),
      })
      if (isApiError(r)) throw new Error(r.error.message)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['logging-config', guildId] }); toast.success('Logging settings saved'); onClose() },
    onError: (e: Error) => toast.error(e.message),
  })

  const KEY_EVENTS: [string, string][] = [
    ['messageDelete', 'Message deleted'],
    ['messageUpdate', 'Message edited'],
    ['memberJoin', 'Member joined'],
    ['memberLeave', 'Member left'],
    ['moderationBan', 'Member banned'],
    ['moderationKick', 'Member kicked'],
    ['moderationMute', 'Member muted'],
    ['moderationWarn', 'Member warned'],
    ['voiceJoin', 'Voice join'],
    ['voiceLeave', 'Voice leave'],
    ['channelCreate', 'Channel created'],
    ['channelDelete', 'Channel deleted'],
    ['roleCreate', 'Role created'],
    ['roleDelete', 'Role deleted'],
  ]

  if (isLoading) return <div className="p-6 text-muted-foreground text-sm">Loading…</div>

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Label>Log channel</Label>
        <Select value={channelId} onValueChange={setChannelId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a channel…" />
          </SelectTrigger>
          <SelectContent>
            {textChannels(channels).map(c => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-1.5"><Hash className="h-3 w-3 opacity-50" />{c.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">All logged events will be posted here.</p>
      </div>
      <Separator />
      <div className="space-y-3">
        <p className="text-sm font-medium">Events to log</p>
        <div className="grid grid-cols-1 gap-2">
          {KEY_EVENTS.map(([k, label]) => (
            <div key={k} className="flex items-center justify-between py-1">
              <Label className="text-sm font-normal cursor-pointer" htmlFor={`evt-${k}`}>{label}</Label>
              <Switch
                id={`evt-${k}`}
                checked={!!events[k]}
                onCheckedChange={v => setEvents(prev => ({ ...prev, [k]: v }))}
              />
            </div>
          ))}
        </div>
      </div>
      <Button className="w-full" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving…' : 'Save logging settings'}
      </Button>
    </div>
  )
}

function WelcomeSettings({ guildId, onClose }: { guildId: string; onClose: () => void }) {
  const qc = useQueryClient()

  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['guild-channels', guildId],
    queryFn: async () => {
      const r = await apiRequest<{ channels: Channel[] }>(`/guilds/${guildId}/resources`)
      return isApiError(r) ? [] : r.data.channels
    },
  })

  const { data: cfg, isLoading } = useQuery<WelcomeConfig>({
    queryKey: ['welcome-config', guildId],
    queryFn: async () => {
      const r = await apiRequest<{ config: WelcomeConfig }>(`/guilds/${guildId}/welcome/config`)
      if (isApiError(r)) throw new Error(r.error.message)
      return r.data.config
    },
  })

  const [channelId, setChannelId] = useState('')
  const [message, setMessage] = useState('')
  const [sendDm, setSendDm] = useState(false)
  const [dmMessage, setDmMessage] = useState('')

  useEffect(() => {
    if (cfg) {
      setChannelId(cfg.channelId ?? '')
      setMessage(cfg.message ?? '')
      setSendDm(cfg.sendDm ?? false)
      setDmMessage(cfg.dmMessage ?? '')
    }
  }, [cfg])

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest(`/guilds/${guildId}/welcome/config`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: true, channelId: channelId || null, message: message || null, sendDm, dmMessage: dmMessage || null, autoRoleIds: cfg?.autoRoleIds ?? [] }),
      })
      if (isApiError(r)) throw new Error(r.error.message)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['welcome-config', guildId] }); toast.success('Welcome settings saved'); onClose() },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return <div className="p-6 text-muted-foreground text-sm">Loading…</div>

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Label>Welcome channel</Label>
        <Select value={channelId} onValueChange={setChannelId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a channel…" />
          </SelectTrigger>
          <SelectContent>
            {textChannels(channels).map(c => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-1.5"><Hash className="h-3 w-3 opacity-50" />{c.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Welcome message</Label>
        <Textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Welcome {user} to {guild}! You are member #{membercount}."
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Variables: <code className="text-primary">{'{user}'}</code> <code className="text-primary">{'{user.name}'}</code> <code className="text-primary">{'{guild}'}</code> <code className="text-primary">{'{membercount}'}</code> <code className="text-primary">{'{channel}'}</code>
        </p>
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Send DM on join</p>
          <p className="text-xs text-muted-foreground">DM the user a private welcome message</p>
        </div>
        <Switch checked={sendDm} onCheckedChange={setSendDm} />
      </div>
      {sendDm && (
        <div className="space-y-2">
          <Label>DM message</Label>
          <Textarea value={dmMessage} onChange={e => setDmMessage(e.target.value)} placeholder="Welcome to {guild}, {user.name}!" rows={3} />
        </div>
      )}
      <Button className="w-full" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving…' : 'Save welcome settings'}
      </Button>
    </div>
  )
}

function InfoSettings({ title, description, commands, link }: { title: string; description: string; commands?: string[]; link?: { label: string; to: string } }) {
  return (
    <div className="p-6 space-y-6">
      <p className="text-sm text-muted-foreground">{description}</p>
      {commands && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Available commands</p>
          <div className="space-y-1.5">
            {commands.map(cmd => (
              <div key={cmd} className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 font-mono text-xs text-primary">
                {cmd}
              </div>
            ))}
          </div>
        </div>
      )}
      {link && (
        <Link to={link.to} className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 text-sm hover:bg-accent transition-colors">
          {link.label}
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </Link>
      )}
    </div>
  )
}

/* ─── settings sheet dispatcher ──────────────────────────────────────────── */
function ModuleSettingsSheet({ mod, guildId, open, onClose }: { mod: ModuleDef | null; guildId: string; open: boolean; onClose: () => void }) {
  if (!mod) return null

  const body = (() => {
    switch (mod.settingsType) {
      case 'logging': return <LoggingSettings guildId={guildId} onClose={onClose} />
      case 'welcome': return <WelcomeSettings guildId={guildId} onClose={onClose} />
      case 'moderation-info': return (
        <InfoSettings
          title="Moderation"
          description="The moderation module gives your moderators a toolkit for managing members. All actions are logged when the Logging module is enabled."
          commands={['?ban @user [reason]', '?kick @user [reason]', '?mute @user [duration]', '?unmute @user', '?warn @user [reason]', '?clear [amount]', '?slowmode [seconds]']}
        />
      )
      case 'music-info': return (
        <InfoSettings
          title="Music"
          description="Stream music from YouTube and other sources directly in voice channels. The bot must be in a voice channel to use music commands."
          commands={['?play [song/URL]', '?skip', '?queue', '?stop', '?pause', '?resume', '?nowplaying']}
        />
      )
      case 'leveling-info': return (
        <InfoSettings
          title="Leveling"
          description="Members earn XP for sending messages. When they reach a new level the bot announces it. Use ?rank to see your progress and ?leaderboard to see the top members."
          commands={['?rank [@user]', '?leaderboard']}
        />
      )
      case 'reaction-info': return (
        <InfoSettings
          title="Reaction Roles"
          description="Create messages that members can react to in order to assign themselves roles. Set up panels in your server using the bot's admin commands or the ticket panel page."
          commands={['?rr add #channel emoji @Role', '?rr remove #channel emoji']}
        />
      )
      case 'tickets-info': return (
        <InfoSettings
          title="Tickets"
          description="Create support ticket panels. When a member clicks the button, a private channel is opened for them and your staff team."
          commands={['?ticket create [reason]', '?ticket close', '?ticket add @user', '?ticket remove @user']}
        />
      )
      case 'applications-info': return (
        <InfoSettings
          title="Applications"
          description="Build application forms with custom questions. Submissions are sent to a review channel where staff can accept or reject applicants."
          commands={['?apply [form name]']}
        />
      )
      case 'link-custom-commands': return (
        <InfoSettings
          title="Custom Commands"
          description="Create your own bot commands with custom responses, variables, and cooldowns. Manage them from the Custom Commands page."
          link={{ label: 'Go to Custom Commands →', to: `/guilds/${guildId}/custom-commands` }}
        />
      )
      case 'link-auto-responses': return (
        <InfoSettings
          title="Auto Responses"
          description="The bot automatically replies when a message matches a trigger phrase. Manage your auto-responses from the Custom Commands page."
          link={{ label: 'Go to Custom Commands →', to: `/guilds/${guildId}/custom-commands` }}
        />
      )
      default: return null
    }
  })()

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle className="flex items-center gap-2">
            {mod.icon && <mod.icon className="h-4 w-4 text-primary" />}
            {mod.label} Settings
          </SheetTitle>
          <SheetDescription>{mod.description}</SheetDescription>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}

/* ─── module card ────────────────────────────────────────────────────────── */
function ModuleCard({
  mod, enabled, onToggle, onSettings, index, saving,
}: {
  mod: ModuleDef; enabled: boolean; onToggle: () => void; onSettings: () => void; index: number; saving: boolean
}) {
  const Icon = mod.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card className={cn(
        'border-border/60 bg-background/70 backdrop-blur transition-all duration-200',
        enabled ? 'border-primary/20' : 'opacity-80'
      )}>
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn('p-2 rounded-lg shrink-0 mt-0.5', enabled ? 'bg-primary/15' : 'bg-muted/60')}>
              <Icon className={cn('h-4 w-4', enabled ? 'text-primary' : 'text-muted-foreground')} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold">{mod.label}</CardTitle>
              <CardDescription className="text-xs mt-0.5 leading-relaxed">{mod.description}</CardDescription>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={saving}
            className="shrink-0 mt-0.5"
          />
        </CardHeader>
        <CardContent className="pt-0 flex items-center justify-between">
          <Badge
            variant={enabled ? 'default' : 'secondary'}
            className={cn('text-xs', enabled ? 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/25' : '')}
          >
            {enabled ? 'Active' : 'Disabled'}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={onSettings}
          >
            <Settings className="h-3 w-3" />
            Settings
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ─── command card ───────────────────────────────────────────────────────── */
function CommandCard({ cmd, enabled, onToggle }: { cmd: CommandDef; enabled: boolean; onToggle: () => void }) {
  const [showHelp, setShowHelp] = useState(false)
  return (
    <div className={cn(
      'rounded-xl border bg-background/60 backdrop-blur p-4 transition-all',
      enabled ? 'border-border/60' : 'border-border/30 opacity-60'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <code className="text-sm font-semibold text-primary">{cmd.syntax}</code>
            {cmd.requiresPermission && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-400">
                {cmd.requiresPermission}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{cmd.description}</p>
          {showHelp && cmd.example && (
            <div className="mt-2 rounded-md bg-muted/40 px-3 py-2">
              <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1">Example</p>
              <code className="text-xs text-foreground">{cmd.example}</code>
            </div>
          )}
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          className="shrink-0"
        />
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => setShowHelp(v => !v)}
        >
          <HelpCircle className="h-3 w-3" />
          {showHelp ? 'Hide help' : 'Help'}
        </Button>
      </div>
    </div>
  )
}

/* ─── main page ──────────────────────────────────────────────────────────── */
function GuildBotRoute() {
  const { guildId } = Route.useParams()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeModule, setActiveModule] = useState<ModuleDef | null>(null)
  const [activeCategory, setActiveCategory] = useState(COMMAND_CATALOG[0].label)

  /* fetch bot config */
  const { data: botData, isLoading } = useQuery<{ config: BotConfig }>({
    queryKey: ['bot-config', guildId],
    queryFn: async () => {
      const r = await apiRequest<{ config: BotConfig }>(`/guilds/${guildId}/bot`)
      if (isApiError(r)) throw new Error(r.error.message)
      return r.data
    },
  })

  const config = botData?.config

  /* toggle module — instant save */
  const toggleMutation = useMutation({
    mutationFn: async (newModules: Record<ModuleKey, boolean>) => {
      const r = await apiRequest(`/guilds/${guildId}/bot`, {
        method: 'PUT',
        body: JSON.stringify({ modules: newModules, moduleSettings: config?.moduleSettings }),
      })
      if (isApiError(r)) throw new Error(r.error.message)
      return r.data
    },
    onMutate: async (newModules) => {
      await qc.cancelQueries({ queryKey: ['bot-config', guildId] })
      const prev = qc.getQueryData(['bot-config', guildId])
      qc.setQueryData(['bot-config', guildId], (old: { config: BotConfig } | undefined) =>
        old ? { config: { ...old.config, modules: newModules } } : old
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => { qc.setQueryData(['bot-config', guildId], ctx?.prev); toast.error('Failed to save') },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bot-config', guildId] }) },
  })

  /* toggle command — saves to moduleSettings */
  const cmdMutation = useMutation({
    mutationFn: async ({ cmdName, enabled }: { cmdName: string; enabled: boolean }) => {
      const current = (config?.moduleSettings?.commands as Record<string, boolean>) ?? {}
      const r = await apiRequest(`/guilds/${guildId}/bot/settings`, {
        method: 'PATCH',
        body: JSON.stringify({ key: 'commands', value: { ...current, [cmdName]: enabled } }),
      })
      if (isApiError(r)) throw new Error(r.error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bot-config', guildId] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const handleToggle = (key: ModuleKey) => {
    if (!config) return
    const newModules = { ...config.modules, [key]: !config.modules[key] } as Record<ModuleKey, boolean>
    toggleMutation.mutate(newModules)
  }

  const openSettings = (mod: ModuleDef) => { setActiveModule(mod); setSettingsOpen(true) }

  const cmdOverrides = (config?.moduleSettings?.commands as Record<string, boolean>) ?? {}
  const isCmdEnabled = (name: string) => cmdOverrides[name] !== false // default: enabled

  const filteredModules = MODULES.filter(m =>
    !search || m.label.toLowerCase().includes(search.toLowerCase()) || m.description.toLowerCase().includes(search.toLowerCase())
  )

  const currentCategoryCommands = COMMAND_CATALOG.find(c => c.label === activeCategory)?.commands ?? []

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <BunnyMascot size="lg" animated />
        <div className="animate-pulse text-muted-foreground text-sm">Loading configuration…</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6">

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bot Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Enable modules and configure commands for this server.</p>
        </div>

        <Tabs defaultValue="modules" className="space-y-4">
          <TabsList className="bg-background/60 border border-border/60">
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="commands">Commands</TabsTrigger>
          </TabsList>

          {/* ── Modules tab ── */}
          <TabsContent value="modules" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search modules…"
                className="pl-9 bg-background/60"
              />
            </div>

            {filteredModules.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No modules match "{search}"</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredModules.map((mod, i) => (
                  <ModuleCard
                    key={mod.key}
                    mod={mod}
                    enabled={config?.modules[mod.key] ?? false}
                    onToggle={() => handleToggle(mod.key)}
                    onSettings={() => openSettings(mod)}
                    index={i}
                    saving={toggleMutation.isPending}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Commands tab ── */}
          <TabsContent value="commands" className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-background/50 p-4 space-y-1">
              <p className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Command prefix: <code className="text-primary font-mono">?</code>
              </p>
              <p className="text-xs text-muted-foreground">
                Toggle commands on or off for this server. Disabled commands will be ignored by the bot even if the module is active.
              </p>
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-2">
              {COMMAND_CATALOG.map(cat => (
                <button
                  key={cat.label}
                  onClick={() => setActiveCategory(cat.label)}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                    activeCategory === cat.label
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background/60 border border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Enable/Disable all for category */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => {
                  currentCategoryCommands.forEach(cmd => {
                    if (!isCmdEnabled(cmd.name)) cmdMutation.mutate({ cmdName: cmd.name, enabled: true })
                  })
                }}
              >
                <Check className="h-3 w-3 text-green-500" /> Enable all
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => {
                  currentCategoryCommands.forEach(cmd => {
                    if (isCmdEnabled(cmd.name)) cmdMutation.mutate({ cmdName: cmd.name, enabled: false })
                  })
                }}
              >
                <X className="h-3 w-3 text-red-500" /> Disable all
              </Button>
            </div>

            <div className="grid gap-3">
              {currentCategoryCommands.map(cmd => (
                <CommandCard
                  key={cmd.name}
                  cmd={cmd}
                  enabled={isCmdEnabled(cmd.name)}
                  onToggle={() => cmdMutation.mutate({ cmdName: cmd.name, enabled: !isCmdEnabled(cmd.name) })}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ModuleSettingsSheet
        mod={activeModule}
        guildId={guildId}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}

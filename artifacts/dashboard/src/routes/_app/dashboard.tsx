import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  Bot,
  ChevronRight,
  FileText,
  MessageSquare,
  Settings,
  Terminal,
  Ticket,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiRequest, isApiError } from '@/lib/api'
import { BunnyMascot } from '@/components/BunnyMascot'

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardOverviewRoute,
})

interface Guild {
  id: string
  name: string
  icon: string | null
  memberCount?: number
}

interface BotStatus {
  online: boolean
  latency?: number
  guilds?: number
  uptime?: number
}

const QUICK_LINKS = [
  {
    title: 'Bot Modules',
    description: 'Enable and configure bot features like logging, welcome messages, and moderation.',
    icon: Bot,
    param: 'bot',
  },
  {
    title: 'Custom Commands',
    description: 'Create custom bot commands with variables, cooldowns, and permission controls.',
    icon: Terminal,
    param: 'custom-commands',
  },
  {
    title: 'Applications',
    description: 'Build application forms, send panels to Discord, and review member submissions.',
    icon: FileText,
    param: 'applications',
  },
  {
    title: 'Tickets',
    description: 'Set up support ticket panels so members can get help from your staff team.',
    icon: Ticket,
    param: 'tickets',
  },
]

function GuildCard({ guild }: { guild: Guild }) {
  const icon = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`
    : null

  return (
    <Link to="/guilds/$guildId/bot" params={{ guildId: guild.id }}>
      <Card className="border-border/60 bg-background/70 backdrop-blur hover:border-primary/40 hover:bg-background/90 transition-all cursor-pointer group">
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          {icon ? (
            <img src={icon} alt={guild.name} className="h-10 w-10 rounded-full shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">{guild.name[0]}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm truncate">{guild.name}</CardTitle>
            {guild.memberCount && (
              <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                <Users className="h-3 w-3" />
                {guild.memberCount.toLocaleString()} members
              </CardDescription>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </CardHeader>
      </Card>
    </Link>
  )
}

function DashboardOverviewRoute() {
  const { data: guilds = [], isLoading: guildsLoading } = useQuery<Guild[]>({
    queryKey: ['guilds'],
    queryFn: async () => {
      const r = await apiRequest<{ guilds: Guild[] }>('/guilds')
      if (isApiError(r)) return []
      return r.data.guilds ?? []
    },
  })

  const { data: botStatus } = useQuery<BotStatus>({
    queryKey: ['bot-status'],
    queryFn: async () => {
      const r = await apiRequest<BotStatus>('/bot/status')
      if (isApiError(r)) return { online: false }
      return r.data
    },
    refetchInterval: 30_000,
  })

  const firstGuild = guilds[0]

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 md:px-6 lg:px-8">

        {/* Header */}
        <section className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Select a server from the list below to manage its settings.
          </p>
        </section>

        {/* Bot status bar */}
        <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/60 px-4 py-3">
          <div className={`h-2 w-2 rounded-full ${botStatus?.online ? 'bg-green-400' : 'bg-muted-foreground'}`} />
          <span className="text-sm font-medium">
            United Bunnies Bot — {botStatus?.online ? 'Online' : 'Offline'}
          </span>
          {botStatus?.latency != null && (
            <Badge variant="outline" className="text-[11px] ml-auto">
              {botStatus.latency}ms
            </Badge>
          )}
          {botStatus?.guilds != null && (
            <Badge variant="outline" className="text-[11px]">
              {botStatus.guilds} servers
            </Badge>
          )}
          <Activity className="h-4 w-4 text-muted-foreground ml-auto" />
        </div>

        {/* Your servers */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Your Servers</h2>
          {guildsLoading ? (
            <div className="flex items-center justify-center py-12 gap-3">
              <BunnyMascot size="md" animated />
              <span className="text-sm text-muted-foreground animate-pulse">Loading servers…</span>
            </div>
          ) : guilds.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground text-sm">
                  No servers found. Make sure the bot is in at least one server you manage.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {guilds.map(g => <GuildCard key={g.id} guild={g} />)}
            </div>
          )}
        </section>

        {/* Quick actions — link to first guild if available */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_LINKS.map(item => {
              const Icon = item.icon
              const href = firstGuild ? `/guilds/${firstGuild.id}/${item.param}` : '/dashboard'
              return (
                <Link key={item.title} to={href as never}>
                  <Card className="border-border/60 bg-background/70 backdrop-blur hover:border-primary/30 transition-all cursor-pointer h-full group">
                    <CardHeader className="pb-2">
                      <div className="rounded-lg bg-primary/10 p-2 w-fit text-primary mb-2 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-sm">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Help section */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Getting Started</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { step: '1', title: 'Pick a server', body: 'Click any server above to open its dashboard. You\'ll see all settings available for that server.' },
              { step: '2', title: 'Enable modules', body: 'Go to Bot Modules to turn on features like moderation, tickets, leveling, and welcome messages.' },
              { step: '3', title: 'Configure & deploy', body: 'Set up your ticket panels and application forms, then deploy them directly to your Discord channels.' },
            ].map(item => (
              <div key={item.step} className="flex gap-4 rounded-lg border border-border/50 bg-background/60 p-4">
                <div className="shrink-0 h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
                  {item.step}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import { Ban, Bot, MousePointerClick, Power, ShieldAlert, Terminal, Users } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest, isApiError } from '@/lib/api'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import type { CursorType } from '@/components/CustomCursor'

export const Route = createFileRoute('/_app/developer-portal')({
  component: DeveloperPortalRoute,
})

const globalCommandStates = [
  { command: 'moderation', status: 'enabled', reason: 'Core safety system should stay active.' },
  { command: 'music', status: 'paused', reason: 'Useful for incident response during voice abuse.' },
  { command: 'economy', status: 'enabled', reason: 'No current risk signal.' },
  { command: 'custom commands', status: 'review', reason: 'Ideal place for future global kill-switch.' },
]

const serverActions = [
  { name: 'Ban server from bot', note: 'Prevents the guild from using commands until manually removed.' },
  { name: 'Disable commands globally', note: 'Turns off selected systems for every guild at once.' },
  { name: 'Mark server high risk', note: 'Lets developers review abuse patterns before hard banning.' },
  { name: 'Force bot leave', note: 'Emergency exit for malicious or compromised communities.' },
]

function DeveloperPortalRoute() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Owner Tools
            </p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Developer portal for bot-wide control
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
              This section is the front-end control surface for the actions you asked for:
              global command management, server bans, emergency shutdown flows, and space
              for adding more background and mouse customization options later.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">View audit queue</Button>
            <Button>Open live bot controls</Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatusCard
            title="Global Command Control"
            value="Ready"
            description="UI place for disabling modules or single commands across every server."
            icon={Power}
          />
          <StatusCard
            title="Server Enforcement"
            value="Ready"
            description="Ban, review, or force-leave actions belong here."
            icon={Ban}
          />
          <StatusCard
            title="Developer Access"
            value="Planned"
            description="Add role-based access so trusted staff can manage backgrounds and cursor presets."
            icon={Users}
          />
          <StatusCard
            title="Bot Health"
            value="Hook API"
            description="Connect latency, shard status, and incident actions from the backend."
            icon={Bot}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle>Global command states</CardTitle>
              <CardDescription>
                Suggested structure for bot-wide command overrides.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {globalCommandStates.map((item) => (
                <div
                  key={item.command}
                  className="flex flex-col gap-2 rounded-lg border border-border/50 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium capitalize text-foreground">{item.command}</p>
                    <p className="text-sm text-muted-foreground">{item.reason}</p>
                  </div>
                  <span className="rounded-full border border-border/60 px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {item.status}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle>Recommended owner actions</CardTitle>
              <CardDescription>
                High-value controls to expose once the backend routes are added.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {serverActions.map((item) => (
                <div key={item.name} className="rounded-lg border border-border/50 p-4">
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="mt-1">{item.note}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle>Developer customization access</CardTitle>
              <CardDescription>
                Matches your request to let trusted developers add more dashboard visuals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border border-border/50 p-4">
                Grant access to add new background presets, adjust aurora palettes, and define
                mouse follower defaults from a single owner-managed screen.
              </div>
              <div className="rounded-lg border border-border/50 p-4">
                Store preset metadata in Mongo so both the login background and dashboard shell
                can share approved theme packs later.
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle>Backend notes</CardTitle>
              <CardDescription>
                The UI is in place, but these controls still need real enforcement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3 rounded-lg border border-border/50 p-4">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Add owner-only API endpoints for global command overrides, banned guild lists,
                and developer role permissions.
              </div>
              <div className="flex gap-3 rounded-lg border border-border/50 p-4">
                <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Update `mongo_bridge.py` and `bot.py` so global disable rules and banned guilds
                apply before any command executes.
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

function StatusCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: string
  description: string
  icon: typeof Power
}) {
  return (
    <Card className="border-border/60 bg-background/70 backdrop-blur">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <CardDescription>{title}</CardDescription>
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

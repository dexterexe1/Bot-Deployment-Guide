import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Activity,
  Bot,
  Code2,
  Palette,
  Shield,
  Sparkles,
  Star,
  Terminal,
  Settings,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardOverviewRoute,
})

const quickStats = [
  {
    title: 'Developer Controls',
    value: 'Global',
    description: 'Command kill-switches, server bans, and bot-wide moderation controls.',
    icon: Shield,
  },
  {
    title: 'Premium Systems',
    value: 'Advanced',
    description: 'Non-prefix command access and Dyno-style custom command planning.',
    icon: Star,
  },
  {
    title: 'Customization',
    value: 'Live',
    description: 'Background aurora and sidebar bunny follower settings persist locally.',
    icon: Palette,
  },
  {
    title: 'Bot Health',
    value: 'Ready',
    description: 'Dashboard shell is prepared for live latency and guild telemetry.',
    icon: Activity,
  },
]

const focusAreas = [
  {
    title: 'Developer Portal',
    description:
      'Control globally disabled commands, manage unsafe servers, and keep a single place for owner-level actions.',
    icon: Code2,
  },
  {
    title: 'Premium',
    description:
      'Design premium-only command workflows before wiring the backend collections and bot execution layer.',
    icon: Sparkles,
  },
  {
    title: 'Bot Integration',
    description:
      'Next backend work lives in dashboard API routes plus mongo_bridge.py and bot.py for runtime enforcement.',
    icon: Bot,
  },
]

function DashboardOverviewRoute() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <section className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            United Bunnies Control Center
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Dashboard overview for developer, premium, and theme systems
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
            The dashboard shell now includes dedicated sections for developer tools,
            premium command design, and live visual customization so the next backend
            integrations have a clear place to plug in.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickStats.map((item) => {
            const Icon = item.icon

            return (
              <Card key={item.title} className="border-border/60 bg-background/70 backdrop-blur">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <CardDescription>{item.title}</CardDescription>
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{item.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle>What is ready in the UI</CardTitle>
              <CardDescription>
                These sections are available inside the protected shell right now.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              {focusAreas.map((item) => {
                const Icon = item.icon

                return (
                  <div key={item.title} className="flex gap-3 rounded-lg border border-border/50 p-4">
                    <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p>{item.description}</p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle>Recommended next backend work</CardTitle>
              <CardDescription>
                These items still need real API and bot enforcement to become operational.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border border-border/50 p-4">
                Add owner-only API endpoints for global command overrides, banned guilds,
                and developer-managed bot status controls.
              </div>
              <div className="rounded-lg border border-border/50 p-4">
                Extend Mongo collections for premium entitlements, non-prefix allowlists,
                and multi-response custom command definitions.
              </div>
              <div className="rounded-lg border border-border/50 p-4">
                Teach `mongo_bridge.py` and `bot.py` to read and enforce those settings at
                runtime across every guild.
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Quick Server Actions</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Link to="/guilds/$guildId/bot" params={{ guildId: "1234567890" }}>
              <Card className="border-border/60 bg-background/70 backdrop-blur hover:border-primary/30 transition cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <Settings className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Bot Modules</CardTitle>
                      <CardDescription>Enable/disable features for a server</CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Open →</Button>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/guilds/$guildId/custom-commands" params={{ guildId: "1234567890" }}>
              <Card className="border-border/60 bg-background/70 backdrop-blur hover:border-primary/30 transition cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <Terminal className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Custom Commands</CardTitle>
                      <CardDescription>Dyno-style commands with variables</CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Open →</Button>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

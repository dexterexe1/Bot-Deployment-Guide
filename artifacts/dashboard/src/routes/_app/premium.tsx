import { createFileRoute } from '@tanstack/react-router'
import { Crown, Lock, Sparkles, TerminalSquare, Zap } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_app/premium')({
  component: PremiumRoute,
})

const premiumFeatures = [
  {
    title: 'Non-prefix commands',
    description:
      'Allow trusted users, roles, or channels to invoke selected commands without the normal prefix.',
    icon: Zap,
  },
  {
    title: 'Dyno-style custom commands',
    description:
      'Support variables, multiple responses, embed output, cooldowns, and permission gates.',
    icon: TerminalSquare,
  },
  {
    title: 'Premium entitlements',
    description:
      'Track which guilds or users unlock advanced command packs, badges, and extra limits.',
    icon: Crown,
  },
]

const customCommandIdeas = [
  'Variables like `{user}`, `{server}`, `{mention}`, and `{args}`.',
  'Multiple actions in one command: reply, react, DM, log, or delay.',
  'Per-command permissions for owner, admin, mod, role, or premium tier.',
  'Global disable support so the dev portal can shut down abusive commands fast.',
]

function PremiumRoute() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Premium Systems
            </p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Premium command features and Dyno-style custom commands
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
              This page gives the premium section a real home in the dashboard and maps out
              the systems needed for non-prefix commands, advanced custom commands, and
              future premium gating.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">View entitlement model</Button>
            <Button>Design premium rollout</Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {premiumFeatures.map((feature) => {
            const Icon = feature.icon

            return (
              <Card key={feature.title} className="border-border/60 bg-background/70 backdrop-blur">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <CardDescription>{feature.title}</CardDescription>
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle>How the custom command system should feel</CardTitle>
              <CardDescription>
                Modeled after the flexibility you asked for from Dyno-like commands.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {customCommandIdeas.map((idea) => (
                <div key={idea} className="rounded-lg border border-border/50 p-4">
                  {idea}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle>Example premium command flow</CardTitle>
              <CardDescription>
                One way to structure a richer command builder in the API and bot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border/50 p-4">
                <p className="text-sm font-medium text-foreground">Command trigger</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  `hello` can run as `?hello`, slash command, or non-prefix if the guild has the
                  premium allowlist enabled.
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-4">
                <p className="text-sm font-medium text-foreground">Execution chain</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Check premium entitlement, verify role permissions, process variables, then run
                  multiple responses or delayed follow-ups.
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-4">
                <p className="text-sm font-medium text-foreground">Safety hooks</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The developer portal should still be able to globally disable or suspend the
                  command if it is abused.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle>What still needs backend work</CardTitle>
              <CardDescription>
                These features are designed in the UI, not enforced yet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3 rounded-lg border border-border/50 p-4">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Store premium entitlements and non-prefix allowlists in Mongo with guild and user scope.
              </div>
              <div className="flex gap-3 rounded-lg border border-border/50 p-4">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Extend custom command schemas to support variables, actions, cooldowns, and embed payloads.
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle>Bot integration notes</CardTitle>
              <CardDescription>
                Runtime enforcement belongs in the bot and the bridge layer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border border-border/50 p-4">
                Update `mongo_bridge.py` to cache premium flags, allowed non-prefix contexts,
                and advanced custom command definitions.
              </div>
              <div className="rounded-lg border border-border/50 p-4">
                Update `bot.py` to parse non-prefix matches carefully so normal chat messages do
                not trigger commands unexpectedly.
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

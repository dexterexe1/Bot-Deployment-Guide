import { createFileRoute } from '@tanstack/react-router'
import { FileText, FolderTree, Settings, Shield, Sparkles } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_app/settings')({
  component: SettingsRoute,
})

const settingsCards = [
  {
    title: 'Project context',
    description:
      'The AI handoff file is kept updated so future edits do not require re-reading the whole repository.',
    icon: FileText,
  },
  {
    title: 'Dashboard structure',
    description:
      'Protected routes now have dedicated sections for overview, developer tools, premium, customization, and settings.',
    icon: FolderTree,
  },
  {
    title: 'Operational safety',
    description:
      'Developer-only controls should stay behind strict owner checks in the API and bot before going live.',
    icon: Shield,
  },
]

function SettingsRoute() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Workspace Settings
            </p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Settings and AI project handoff
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
              This page documents the high-level workspace state, where the new dashboard
              sections live, and what still needs backend enforcement for the systems you
              requested.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">Review pending backend work</Button>
            <Button>Open project context plan</Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {settingsCards.map((item) => {
            const Icon = item.icon

            return (
              <Card key={item.title} className="border-border/60 bg-background/70 backdrop-blur">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <CardDescription>{item.title}</CardDescription>
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Current dashboard structure
              </CardTitle>
              <CardDescription>
                Useful for future AI runs and for planning backend follow-up work.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border border-border/50 p-4">
                `/dashboard` is the protected overview page inside the shell.
              </div>
              <div className="rounded-lg border border-border/50 p-4">
                `/developer-portal`, `/premium`, `/customization`, and `/settings` now have
                dedicated route files under `src/routes/_app/`.
              </div>
              <div className="rounded-lg border border-border/50 p-4">
                Customization settings are stored in localStorage and applied live to the
                cinematic background and sidebar mouse followers.
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Remaining implementation notes
              </CardTitle>
              <CardDescription>
                Still needed before these controls become truly production-ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border border-border/50 p-4">
                Build real API endpoints for developer actions, premium entitlements, and
                persistent customization presets.
              </div>
              <div className="rounded-lg border border-border/50 p-4">
                Enforce global command disable rules, banned guild lists, and non-prefix
                command logic in `mongo_bridge.py` and `bot.py`.
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

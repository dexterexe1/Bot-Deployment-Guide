import { createFileRoute, redirect } from '@tanstack/react-router'
import { Ban, Bot, Check, MousePointerClick, Paintbrush, Power, ShieldAlert, Terminal, Users } from 'lucide-react'
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
  async beforeLoad() {
    const result = await apiRequest<{ user: unknown; isDeveloper: boolean }>('/auth/me')
    if (isApiError(result) || !result.data.isDeveloper) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DeveloperPortalRoute,
})

/* ─── types ─────────────────────────────────────────────────────────── */
interface CursorSettings {
  enabled: boolean
  type: CursorType | 'default'
  color: string
}

interface SiteSettings {
  cursor: CursorSettings
}

/* ─── cursor presets ─────────────────────────────────────────────────── */
const CURSOR_TYPES: { value: CursorType | 'default'; label: string; description: string }[] = [
  { value: 'bunny-glow', label: '✨ Bunny Glow', description: 'Glowing bunny with bloom filter (default)' },
  { value: 'bunny', label: '🐰 Bunny', description: 'Clean bunny cursor, no glow' },
  { value: 'bunny-large', label: '🐇 Bunny Large', description: 'Larger bunny, great for presentations' },
  { value: 'default', label: '⬆ System Default', description: 'Disable custom cursor entirely' },
]

const COLOR_PRESETS = [
  { label: 'Purple (default)', value: 'rgba(168, 85, 247, 0.92)' },
  { label: 'Blue', value: 'rgba(59, 130, 246, 0.92)' },
  { label: 'Pink', value: 'rgba(236, 72, 153, 0.92)' },
  { label: 'Cyan', value: 'rgba(6, 182, 212, 0.92)' },
  { label: 'Emerald', value: 'rgba(16, 185, 129, 0.92)' },
  { label: 'Rose', value: 'rgba(244, 63, 94, 0.92)' },
  { label: 'Amber', value: 'rgba(245, 158, 11, 0.92)' },
  { label: 'White', value: 'rgba(255, 255, 255, 0.92)' },
]

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

/* ─── cursor control card ─────────────────────────────────────────────── */
function CursorControlCard() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<SiteSettings>({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const result = await apiRequest<{ settings: SiteSettings }>('/site-settings')
      if (isApiError(result)) throw new Error(result.error.message)
      return result.data.settings
    },
    staleTime: 30_000,
  })

  const [enabled, setEnabled] = useState(true)
  const [cursorType, setCursorType] = useState<CursorType | 'default'>('bunny-glow')
  const [color, setColor] = useState('rgba(168, 85, 247, 0.92)')
  const [dirty, setDirty] = useState(false)

  // Hydrate local state from fetched data
  useEffect(() => {
    if (data?.cursor) {
      setEnabled(data.cursor.enabled)
      setCursorType(data.cursor.type)
      setColor(data.cursor.color)
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: async (patch: { cursor: Partial<CursorSettings> }) => {
      const result = await apiRequest('/site-settings', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      if (isApiError(result)) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] })
      setDirty(false)
      toast.success('Cursor settings saved — changes apply to all visitors instantly!')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to save cursor settings')
    },
  })

  function handleSave() {
    mutation.mutate({ cursor: { enabled, type: cursorType, color } })
  }

  function pick(field: 'enabled' | 'type' | 'color', value: unknown) {
    if (field === 'enabled') setEnabled(value as boolean)
    if (field === 'type') setCursorType(value as CursorType | 'default')
    if (field === 'color') setColor(value as string)
    setDirty(true)
  }

  return (
    <Card className="border-border/60 bg-background/70 backdrop-blur col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <MousePointerClick className="h-5 w-5 text-primary" />
              Live Cursor Controls
            </CardTitle>
            <CardDescription>
              Changes save to MongoDB and apply to every visitor within ~60 seconds — no redeploy needed.
            </CardDescription>
          </div>
          <Button
            onClick={handleSave}
            disabled={!dirty || mutation.isPending || isLoading}
            size="sm"
          >
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 md:grid-cols-[1fr_1.5fr_1fr]">
        {/* --- Enable toggle --- */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Custom cursor</p>
          <div className="flex items-center gap-3 rounded-lg border border-border/50 p-4">
            <Switch
              id="cursor-enabled"
              checked={enabled}
              onCheckedChange={(v) => pick('enabled', v)}
              disabled={isLoading}
            />
            <Label htmlFor="cursor-enabled" className="cursor-pointer text-sm">
              {enabled ? 'Enabled — bunny cursor active' : 'Disabled — system cursor'}
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            When disabled, visitors see their OS cursor instead.
          </p>
        </div>

        {/* --- Type selector --- */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Cursor style</p>
          <div className="grid gap-2">
            {CURSOR_TYPES.map((ct) => (
              <button
                key={ct.value}
                type="button"
                onClick={() => pick('type', ct.value)}
                disabled={isLoading}
                className={[
                  'flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition',
                  cursorType === ct.value
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground',
                ].join(' ')}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current">
                  {cursorType === ct.value && <Check className="h-2.5 w-2.5" />}
                </span>
                <span>
                  <span className="font-medium">{ct.label}</span>
                  <br />
                  <span className="text-xs opacity-70">{ct.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* --- Color picker --- */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Cursor color</p>
          <div className="grid grid-cols-4 gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                title={preset.label}
                onClick={() => pick('color', preset.value)}
                disabled={isLoading}
                style={{ background: preset.value }}
                className={[
                  'h-9 w-full rounded-md border-2 transition',
                  color === preset.value ? 'border-white scale-110 shadow-lg shadow-current/30' : 'border-transparent hover:scale-105',
                ].join(' ')}
              />
            ))}
          </div>

          {/* Live preview box */}
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-border/50 p-3">
            <div
              className="h-8 w-8 shrink-0 rounded-full ring-2 ring-white/20"
              style={{ background: color }}
            />
            <div className="flex-1 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Preview</p>
              <p className="font-mono text-[10px] break-all">{color}</p>
            </div>
          </div>

          {/* Custom RGBA input */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Custom RGBA / hex</Label>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-ring focus:outline-none"
              value={color}
              onChange={(e) => pick('color', e.target.value)}
              placeholder="rgba(168, 85, 247, 0.92)"
              disabled={isLoading}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ─── status card ────────────────────────────────────────────────────── */
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

/* ─── main page ──────────────────────────────────────────────────────── */
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
              Developer portal
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
              Global command management, server bans, emergency controls, and live site
              customization — including the cursor that every visitor sees on your website.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">View audit queue</Button>
            <Button>Open live bot controls</Button>
          </div>
        </section>

        {/* ── LIVE CURSOR CONTROLS ── */}
        <section className="grid gap-4">
          <CursorControlCard />
        </section>

        {/* ── status overview ── */}
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

        {/* ── command states + server actions ── */}
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

        {/* ── backend notes ── */}
        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paintbrush className="h-4 w-4 text-primary" />
                Developer customization access
              </CardTitle>
              <CardDescription>
                Grant access to add more theme packs, background presets, and cursor variants.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border border-border/50 p-4">
                Store preset metadata in Mongo so both the login background and dashboard shell
                can share approved theme packs. The cursor control above already uses this system.
              </div>
              <div className="rounded-lg border border-border/50 p-4">
                Extend the SiteSettings model to include background presets and aurora palettes —
                then add more controls here for full dashboard theming.
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle>Backend enforcement notes</CardTitle>
              <CardDescription>
                Controls that still need real bot-side enforcement to fully work.
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
                Update <code>mongo_bridge.py</code> and <code>bot.py</code> so global disable rules
                and banned guilds apply before any command executes.
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

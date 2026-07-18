import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Paintbrush, Rabbit, Save, RotateCcw, MousePointer2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DEFAULT_CUSTOMIZATION_SETTINGS,
  type BackgroundConfig,
  type CustomizationSettings,
  type MouseFollowerConfig,
  type CustomCursorConfig,
} from '@/types/customization'

export const Route = createFileRoute('/_app/customization')({
  component: CustomizationRoute,
})

const CUSTOMIZATION_KEY = 'dashboard_customization_settings'
const CUSTOMIZATION_EVENT = 'dashboard-customization-change'

function CustomizationRoute() {
  const [settings, setSettings] = useState<CustomizationSettings>(DEFAULT_CUSTOMIZATION_SETTINGS)
  const [hydrated, setHydrated] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const raw = localStorage.getItem(CUSTOMIZATION_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CustomizationSettings>
        setSettings({
          background: {
            ...DEFAULT_CUSTOMIZATION_SETTINGS.background,
            ...parsed.background,
          },
          mouseFollowers: {
            ...DEFAULT_CUSTOMIZATION_SETTINGS.mouseFollowers,
            ...parsed.mouseFollowers,
          },
        })
      }
    } catch {
      setSettings(DEFAULT_CUSTOMIZATION_SETTINGS)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return

    localStorage.setItem(CUSTOMIZATION_KEY, JSON.stringify(settings))
    window.dispatchEvent(
      new CustomEvent<CustomizationSettings>(CUSTOMIZATION_EVENT, {
        detail: settings,
      }),
    )
  }, [hydrated, settings])

  const updateBackground = <K extends keyof BackgroundConfig>(
    key: K,
    value: BackgroundConfig[K],
  ) => {
    setSettings((prev) => ({
      ...prev,
      background: {
        ...prev.background,
        [key]: value,
      },
    }))
  }

  const updateMouse = <K extends keyof MouseFollowerConfig>(
    key: K,
    value: MouseFollowerConfig[K],
  ) => {
    setSettings((prev) => ({
      ...prev,
      mouseFollowers: {
        ...prev.mouseFollowers,
        [key]: value,
      },
    }))
  }

  const updateCustomCursor = <K extends keyof CustomCursorConfig>(
    key: K,
    value: CustomCursorConfig[K],
  ) => {
    setSettings((prev) => ({
      ...prev,
      customCursor: {
        ...prev.customCursor,
        [key]: value,
      },
    }))
  }

  const handleReset = () => {
    setSettings(DEFAULT_CUSTOMIZATION_SETTINGS)
    setSavedAt(new Date().toLocaleTimeString())
  }

  const handleSaveMarker = () => {
    setSavedAt(new Date().toLocaleTimeString())
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Personalization
            </p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Customize backgrounds, bunny followers, and dashboard feel
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
              Changes save locally right away so the cinematic background and sidebar mascot
              behavior update live inside the dashboard shell.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset defaults
            </Button>
            <Button onClick={handleSaveMarker}>
              <Save className="mr-2 h-4 w-4" />
              Mark saved
            </Button>
          </div>
        </section>

        {savedAt ? (
          <p className="text-sm text-muted-foreground">Last updated locally at {savedAt}.</p>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paintbrush className="h-5 w-5 text-primary" />
                Background styling
              </CardTitle>
              <CardDescription>
                Aurora colors, particles, and constellation bunny silhouettes.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <TextSetting
                id="auroraColor1"
                label="Aurora color 1"
                value={settings.background.auroraColor1}
                onChange={(value) => updateBackground('auroraColor1', value)}
              />
              <TextSetting
                id="auroraColor2"
                label="Aurora color 2"
                value={settings.background.auroraColor2}
                onChange={(value) => updateBackground('auroraColor2', value)}
              />
              <TextSetting
                id="auroraColor3"
                label="Aurora color 3"
                value={settings.background.auroraColor3}
                onChange={(value) => updateBackground('auroraColor3', value)}
              />
              <TextSetting
                id="auroraColor4"
                label="Aurora color 4"
                value={settings.background.auroraColor4}
                onChange={(value) => updateBackground('auroraColor4', value)}
              />
              <TextSetting
                id="bunnyColor"
                label="Bunny glow color"
                value={settings.background.bunnyColor}
                onChange={(value) => updateBackground('bunnyColor', value)}
              />
              <RangeSetting
                id="particleCount"
                label="Particle count"
                value={settings.background.particleCount}
                min={10}
                max={200}
                step={5}
                onChange={(value) => updateBackground('particleCount', value)}
              />
              <RangeSetting
                id="particleOpacity"
                label="Particle opacity"
                value={settings.background.particleOpacity}
                min={0.05}
                max={1}
                step={0.05}
                onChange={(value) => updateBackground('particleOpacity', value)}
              />
              <RangeSetting
                id="bunnyCount"
                label="Bunny count"
                value={settings.background.bunnyCount}
                min={0}
                max={20}
                step={1}
                onChange={(value) => updateBackground('bunnyCount', value)}
              />
              <RangeSetting
                id="bunnyOpacity"
                label="Bunny opacity"
                value={settings.background.bunnyOpacity}
                min={0}
                max={0.2}
                step={0.01}
                onChange={(value) => updateBackground('bunnyOpacity', value)}
              />
              <RangeSetting
                id="bunnySizeMin"
                label="Bunny size min"
                value={settings.background.bunnySizeMin}
                min={20}
                max={100}
                step={1}
                onChange={(value) => updateBackground('bunnySizeMin', value)}
              />
              <RangeSetting
                id="bunnySizeMax"
                label="Bunny size max"
                value={settings.background.bunnySizeMax}
                min={20}
                max={140}
                step={1}
                onChange={(value) => updateBackground('bunnySizeMax', value)}
              />
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rabbit className="h-5 w-5 text-primary" />
                Mouse follower behavior
              </CardTitle>
              <CardDescription>
                Tune the sidebar bunnies that follow the pointer after login.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleSetting
                id="mouseEnabled"
                label="Enable mouse followers"
                checked={settings.mouseFollowers.enabled}
                onChange={(value) => updateMouse('enabled', value)}
              />
              <ToggleSetting
                id="showLargeBunny"
                label="Show large bunny"
                checked={settings.mouseFollowers.showLargeBunny}
                onChange={(value) => updateMouse('showLargeBunny', value)}
              />
              <ToggleSetting
                id="showSmallBunny"
                label="Show small bunny"
                checked={settings.mouseFollowers.showSmallBunny}
                onChange={(value) => updateMouse('showSmallBunny', value)}
              />
              <RangeSetting
                id="largeBunnyScale"
                label="Large bunny scale"
                value={settings.mouseFollowers.largeBunnyScale}
                min={0.5}
                max={3}
                step={0.1}
                onChange={(value) => updateMouse('largeBunnyScale', value)}
              />
              <RangeSetting
                id="smallBunnyScale"
                label="Small bunny scale"
                value={settings.mouseFollowers.smallBunnyScale}
                min={0.5}
                max={2}
                step={0.1}
                onChange={(value) => updateMouse('smallBunnyScale', value)}
              />
              <RangeSetting
                id="largeBunnyOpacity"
                label="Large bunny opacity"
                value={settings.mouseFollowers.largeBunnyOpacity}
                min={0}
                max={1}
                step={0.05}
                onChange={(value) => updateMouse('largeBunnyOpacity', value)}
              />
              <RangeSetting
                id="smallBunnyOpacity"
                label="Small bunny opacity"
                value={settings.mouseFollowers.smallBunnyOpacity}
                min={0}
                max={1}
                step={0.05}
                onChange={(value) => updateMouse('smallBunnyOpacity', value)}
              />
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MousePointer2 className="h-5 w-5 text-primary" />
                Custom cursor
              </CardTitle>
              <CardDescription>
                Replace your pointer with a cute bunny cursor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleSetting
                id="customCursorEnabled"
                label="Enable custom cursor"
                checked={settings.customCursor.enabled}
                onChange={(value) => updateCustomCursor('enabled', value)}
              />
              {settings.customCursor.enabled && (
                <>
                  <SelectSetting
                    id="customCursorType"
                    label="Cursor style"
                    value={settings.customCursor.cursorType}
                    options={[
                      { value: 'default', label: 'Default' },
                      { value: 'bunny', label: 'Bunny' },
                      { value: 'bunny-glow', label: 'Bunny glow' },
                      { value: 'bunny-large', label: 'Bunny large' },
                    ]}
                    onChange={(value) => updateCustomCursor('cursorType', value as any)}
                  />
                  <TextSetting
                    id="customCursorColor"
                    label="Cursor color"
                    value={settings.customCursor.cursorColor}
                    onChange={(value) => updateCustomCursor('cursorColor', value)}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

function TextSetting({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function RangeSetting({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-xs text-muted-foreground">{value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted"
      />
    </div>
  )
}

function ToggleSetting({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center justify-between gap-4 rounded-lg border border-border/50 p-4"
    >
      <span className="text-sm font-medium">{label}</span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-border accent-primary"
      />
    </label>
  )
}

function SelectSetting({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:ring-ring/50 focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

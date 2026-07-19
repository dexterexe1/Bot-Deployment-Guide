import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { apiRequest, isApiError } from '@/lib/api'
import type { SessionUser } from '@/types/application'
import { AppSidebar } from '@/features/layout/AppSidebar'
import { Shell } from '@/Shell'
import {
  DEFAULT_CUSTOMIZATION_SETTINGS,
  type CustomizationSettings,
  type CustomCursorConfig,
} from '@/types/customization'
import { Home, Settings } from 'lucide-react'
import { Link } from '@tanstack/react-router'

const CUSTOMIZATION_KEY = 'dashboard_customization_settings'
const LAST_GUILD_KEY = 'dashboard_last_guild_id'

// Placeholder guild data for demo
const MOCK_GUILDS = [{ id: '1234567890', name: 'United Bunnies Server', icon: null }, { id: '0987654321', name: 'Test Community', icon: null }]

// Placeholder Terminal component for missing UI elements
const Terminal = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
)

export const Route = createFileRoute('/_app')({
  component: AppLayout,
  async loader() {
    const result = await apiRequest<{ user: SessionUser; isDeveloper: boolean }>('/auth/me')
    if (isApiError(result)) {
      throw redirect({ to: '/login' })
    }
    return result.data
  },
})

function AppLayout() {
  const { user, isDeveloper } = Route.useLoaderData()
  const [selectedGuild, setSelectedGuild] = useState<string | null>(null)
  const [customizationSettings, setCustomizationSettings] = useState<CustomizationSettings>(
    DEFAULT_CUSTOMIZATION_SETTINGS,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Hydrate last used guild
    try {
      const lastGuild = localStorage.getItem(LAST_GUILD_KEY)
      if (lastGuild && MOCK_GUILDS.some((g) => g.id === lastGuild)) {
        setSelectedGuild(lastGuild)
      } else if (MOCK_GUILDS.length > 0) {
        setSelectedGuild(MOCK_GUILDS[0].id)
      }
    } catch {
      if (MOCK_GUILDS.length > 0) setSelectedGuild(MOCK_GUILDS[0].id)
    }
  }, [])

  useEffect(() => {
    if (selectedGuild && typeof window !== 'undefined') {
      localStorage.setItem(LAST_GUILD_KEY, selectedGuild)
    }
  }, [selectedGuild])

  const handleGuildChange = (guildId: string) => {
    setSelectedGuild(guildId)
  }

  const selectedGuildData = MOCK_GUILDS.find((g) => g.id === selectedGuild)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const syncSettings = (nextValue?: string | null) => {
      try {
        const raw = nextValue ?? localStorage.getItem(CUSTOMIZATION_KEY)
        if (!raw) {
          setCustomizationSettings(DEFAULT_CUSTOMIZATION_SETTINGS)
          return
        }

        const parsed = JSON.parse(raw) as Partial<CustomizationSettings>
        setCustomizationSettings({
          background: {
            ...DEFAULT_CUSTOMIZATION_SETTINGS.background,
            ...parsed.background,
          },
          mouseFollowers: {
            ...DEFAULT_CUSTOMIZATION_SETTINGS.mouseFollowers,
            ...parsed.mouseFollowers,
          },
          customCursor: {
            ...DEFAULT_CUSTOMIZATION_SETTINGS.customCursor,
            ...parsed.customCursor,
          },
        })
      } catch {
        setCustomizationSettings(DEFAULT_CUSTOMIZATION_SETTINGS)
      }
    }

    syncSettings()

    const handleStorage = (event: StorageEvent) => {
      if (event.key === CUSTOMIZATION_KEY) {
        syncSettings(event.newValue)
      }
    }

    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<CustomizationSettings>
      const detail = customEvent.detail
      if (!detail) return
      setCustomizationSettings({
        background: {
          ...DEFAULT_CUSTOMIZATION_SETTINGS.background,
          ...detail.background,
        },
        mouseFollowers: {
          ...DEFAULT_CUSTOMIZATION_SETTINGS.mouseFollowers,
          ...detail.mouseFollowers,
        },
        customCursor: {
          ...DEFAULT_CUSTOMIZATION_SETTINGS.customCursor,
          ...detail.customCursor,
        },
      })
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('dashboard-customization-change', handleCustomEvent)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('dashboard-customization-change', handleCustomEvent)
    }
  }, [])

  return (
    <div className="flex min-h-dvh">
      <Shell
        header={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={selectedGuild || ''}
                  onChange={(e) => handleGuildChange(e.target.value)}
                  className="h-9 w-full min-w-[180px] rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm focus:border-ring focus:ring-ring/50 focus:outline-none"
                >
                  {MOCK_GUILDS.map((guild) => (
                    <option key={guild.id} value={guild.id}>
                      {guild.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        }
        sidebarExtra={
          selectedGuild ? (
            <GuildNavigation guildId={selectedGuild} />
          ) : null
        }
        appName="United Bunnies"
        backgroundConfig={customizationSettings.background}
        customCursor={customizationSettings.customCursor}
        sidebar={<AppSidebar config={customizationSettings.mouseFollowers} user={user} isDeveloper={isDeveloper} />}
      >
        <Outlet />
      </Shell>
    </div>
  )
}

function GuildNavigation({ guildId }: { guildId: string }) {
  return (
    <div className="flex flex-col gap-1 px-2 py-3">
      <p className="px-2 text-[10px] font-medium text-muted-foreground uppercase tracking-[0.2em]">
        Server Settings
      </p>
      {[
        { label: 'Overview', path: '/dashboard', icon: Home },
        { label: 'Bot Modules', path: `/guilds/${guildId}/bot`, icon: Settings },
        { label: 'Custom Commands', path: `/guilds/${guildId}/custom-commands`, icon: Terminal },
      ].map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </div>
  )
}

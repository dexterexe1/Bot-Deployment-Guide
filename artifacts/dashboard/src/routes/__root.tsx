import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from 'sonner'
import { AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { BunnyLoader } from '@/components/BunnyLoader'
import { CustomCursor, type CursorType } from '@/components/CustomCursor'
import { apiRequest, isApiError } from '@/lib/api'

/* ─── types ─────────────────────────────────────────────────────────── */
interface SiteSettings {
  cursor: {
    enabled: boolean
    type: CursorType | 'default'
    color: string
  }
}

const FALLBACK_CURSOR: SiteSettings['cursor'] = {
  enabled: true,
  type: 'bunny-glow',
  color: 'rgba(168, 85, 247, 0.92)',
}

/* ─── route ──────────────────────────────────────────────────────────── */
export const Route = createRootRoute({
  pendingComponent: BunnyLoader,
  pendingMs: 200,
  pendingMinMs: 400,
  component: RootDocument,
})

/* ─── router loading overlay ─────────────────────────────────────────── */
function RouterLoadingOverlay() {
  const isLoading = useRouterState({ select: (s) => s.status === 'pending' })
  return (
    <AnimatePresence>
      {isLoading && <BunnyLoader key="router-loader" />}
    </AnimatePresence>
  )
}

/* ─── root document ──────────────────────────────────────────────────── */
function RootDocument() {
  // Fetch site-wide settings from the API (public endpoint, no auth needed).
  // Cached for 60 s so visitors don't hammer the API; dev changes propagate
  // within one minute without any hard refresh required on the visitor's side.
  const { data } = useQuery<SiteSettings>({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const result = await apiRequest<{ settings: SiteSettings }>('/site-settings')
      if (isApiError(result)) throw new Error(result.error.message)
      return result.data.settings
    },
    staleTime: 60_000,
    retry: 1,
    // Always show something even while fetching
    placeholderData: { cursor: FALLBACK_CURSOR },
  })

  const cursor = data?.cursor ?? FALLBACK_CURSOR
  const cursorEnabled = cursor.enabled && cursor.type !== 'default'

  return (
    <TooltipProvider>
      {/* Cursor driven entirely by dev-portal settings stored in MongoDB */}
      <CustomCursor
        enabled={cursorEnabled}
        cursorType={cursor.type === 'default' ? 'bunny' : (cursor.type as CursorType)}
        cursorColor={cursor.color}
      />
      <Outlet />
      <RouterLoadingOverlay />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'hsl(224 47% 7%)',
            border: '1px solid hsl(224 47% 14%)',
            color: 'hsl(213 31% 91%)',
          },
        }}
      />
    </TooltipProvider>
  )
}

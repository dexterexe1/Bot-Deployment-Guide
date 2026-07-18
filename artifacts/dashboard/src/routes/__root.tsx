import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from 'sonner'
import { AnimatePresence } from 'framer-motion'
import { BunnyLoader } from '@/components/BunnyLoader'

export const Route = createRootRoute({
  pendingComponent: BunnyLoader,
  pendingMs: 200,
  pendingMinMs: 400,
  component: RootDocument,
})

/** Shows the bunny loader overlay whenever the router is navigating */
function RouterLoadingOverlay() {
  const isLoading = useRouterState({ select: (s) => s.status === 'pending' })
  return (
    <AnimatePresence>
      {isLoading && <BunnyLoader key="router-loader" />}
    </AnimatePresence>
  )
}

function RootDocument() {
  return (
    <TooltipProvider>
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

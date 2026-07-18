import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from 'sonner'

export const Route = createRootRoute({
  component: RootDocument,
})

function RootDocument() {
  return (
    <TooltipProvider>
      <Outlet />
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

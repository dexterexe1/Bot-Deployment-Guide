/**
 * Shell — Mobile-responsive app layout (shadcn/ui based).
 *
 * USAGE (in a route or SharedAppLayout):
 *   <Shell sidebar={<MySidebarContent />}>
 *     <Page>...</Page>
 *   </Shell>
 *
 * Desktop (md+): the sidebar is a fixed column on the left, main content fills
 * the rest. Mobile: the sidebar is hidden and opens in a Sheet drawer via the
 * hamburger button in the mobile header. Customize freely — this is your code.
 */
import { useState } from 'react'
import type { ReactNode } from 'react'
// useEffect no longer needed (cursor logic moved to CustomCursor component)
import { CinematicBackground } from '@/components/CinematicBackground'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import type { BackgroundConfig, CustomCursorConfig } from '@/types/customization'
import { DEFAULT_CUSTOM_CURSOR_CONFIG } from '@/types/customization'
import { CustomCursor } from '@/components/CustomCursor'

interface ShellProps {
  /** Sidebar content — e.g. <AppSidebarShell /> or your own nav */
  sidebar?: ReactNode
  /** App name shown in the mobile header */
  appName?: string
  /** Background customization passed to the cinematic shell */
  backgroundConfig?: Partial<BackgroundConfig>
  /** Optional custom cursor settings */
  customCursor?: Partial<CustomCursorConfig>
  /** Optional app header (will show on all screen sizes) */
  header?: ReactNode
  /** Optional second sidebar for guild nav etc. */
  sidebarExtra?: ReactNode
  children: ReactNode
}

export function Shell({
  sidebar,
  appName = 'App',
  backgroundConfig,
  customCursor,
  header,
  sidebarExtra,
  children,
}: ShellProps) {
  const [open, setOpen] = useState(false)

  const cursorConfig: CustomCursorConfig = {
    ...DEFAULT_CUSTOM_CURSOR_CONFIG,
    ...customCursor,
  }

  return (
    <>
      <CinematicBackground config={backgroundConfig} />
      {/* Dashboard-specific cursor config — overrides the global root cursor */}
      <CustomCursor
        enabled={cursorConfig.enabled}
        cursorType={cursorConfig.cursorType === 'default' ? 'bunny' : cursorConfig.cursorType}
        cursorColor={cursorConfig.cursorColor}
      />
      <div className="flex min-h-dvh">
        {/* Desktop sidebars — hidden on mobile, always visible on md+. */}
        <aside className="hidden md:flex shrink-0">
          {sidebar && <div className="shrink-0">{sidebar}</div>}
          {sidebarExtra && (
            <div className="shrink-0 w-64 border-r border-border bg-background/60 backdrop-blur-md">
              {sidebarExtra}
            </div>
          )}
        </aside>

        {/* Mobile sidebar — Sheet drawer opened by the hamburger below. */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-64 p-0">
            {sidebar}
          </SheetContent>
        </Sheet>

        {/* Main content column */}
        <main className="flex flex-1 min-w-0 flex-col">
          {/* Header */}
          {header ? (
            <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
              {header}
            </header>
          ) : (
            <div className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-border bg-background sticky top-0 z-30">
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2"
                aria-label="Open menu"
                onClick={() => setOpen(true)}
              >
                <Menu className="size-5" />
              </Button>
              <span className="font-semibold text-sm">{appName}</span>
            </div>
          )}

          {children}
        </main>
      </div>
    </>
  )
}

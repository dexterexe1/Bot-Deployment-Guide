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
import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { CinematicBackground } from '@/components/CinematicBackground'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import type { BackgroundConfig, CustomCursorConfig } from '@/types/customization'
import { DEFAULT_CUSTOM_CURSOR_CONFIG } from '@/types/customization'

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

function CustomCursor({ config }: { config: CustomCursorConfig }) {
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  if (!config.enabled || config.cursorType === 'default') return null

  const size =
    config.cursorType === 'bunny-large'
      ? 48
      : config.cursorType === 'bunny-glow'
        ? 36
        : 28
  const glow = config.cursorType === 'bunny-glow' ? true : false

  return (
    <div
      className="pointer-events-none fixed z-[9999]"
      style={{
        left: position.x - size / 2,
        top: position.y - size / 2,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        style={{
          filter: glow ? `drop-shadow(0 0 12px ${config.cursorColor}) drop-shadow(0 0 24px ${config.cursorColor})` : 'none',
        }}
      >
        {/* Bunny head */}
        <circle cx="50" cy="60" r="25" fill={config.cursorColor} />
        {/* Left ear */}
        <ellipse cx="38" cy="30" rx="6" ry="20" fill={config.cursorColor} transform="rotate(-15 38 30)" />
        {/* Right ear */}
        <ellipse cx="62" cy="30" rx="6" ry="20" fill={config.cursorColor} transform="rotate(15 62 30)" />
        {/* Left eye */}
        <circle cx="42" cy="58" r="3" fill="rgba(255,255,255,0.9)" />
        {/* Right eye */}
        <circle cx="58" cy="58" r="3" fill="rgba(255,255,255,0.9)" />
        {/* Nose */}
        <circle cx="50" cy="65" r="2" fill="rgba(255,255,255,0.9)" />
      </svg>
    </div>
  )
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
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })

  const cursorConfig = {
    ...DEFAULT_CUSTOM_CURSOR_CONFIG,
    ...customCursor,
  } as CustomCursorConfig

  return (
    <>
      <CinematicBackground config={backgroundConfig} />
      <CustomCursor config={cursorConfig} />
      <div className="flex min-h-dvh" style={{ cursor: cursorConfig.enabled && cursorConfig.cursorType !== 'default' ? 'none' : 'default' }}>
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

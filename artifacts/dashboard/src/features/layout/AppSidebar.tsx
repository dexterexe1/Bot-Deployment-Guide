import { useState, useCallback, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Code2,
  TerminalSquare,
  Bot,
  FileText,
  Ticket,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BunnyMascot } from '@/components/BunnyMascot'
import { Link, useNavigate } from '@tanstack/react-router'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import type { MouseFollowerConfig } from '../../types/customization'
import { DEFAULT_MOUSE_FOLLOWER_CONFIG } from '../../types/customization'
import type { SessionUser } from '@/types/application'
import { apiRequest } from '@/lib/api'

const SIDEBAR_KEY = 'sidebar_collapsed'

interface NavItemDef {
  href: string
  icon: ReactNode
  label: string
  disabled?: boolean
}

function NavItem({ item, collapsed }: { item: NavItemDef; collapsed: boolean }) {
  const cls = cn(
    'flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150',
    collapsed ? 'justify-center w-9 h-9 mx-auto' : 'px-3 py-2 w-full',
    item.disabled
      ? 'opacity-40 cursor-not-allowed text-muted-foreground'
      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground [&.active]:bg-primary/15 [&.active]:text-primary'
  )

  const content = (
    <>
      <span className="shrink-0">{item.icon}</span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </>
  )

  const inner = item.disabled ? (
    <div className={cls}>{content}</div>
  ) : (
    <Link to={item.href} activeProps={{ className: 'active' }} className={cls}>
      {content}
    </Link>
  )

  if (!collapsed) return inner
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>{inner}</span>
      </TooltipTrigger>
      <TooltipContent side="right">
        {item.disabled ? `${item.label} — select a server first` : item.label}
      </TooltipContent>
    </Tooltip>
  )
}

interface AppSidebarProps {
  config?: Partial<MouseFollowerConfig>
  user?: SessionUser | null
  isDeveloper?: boolean
  selectedGuild?: string | null
}

export function AppSidebar({ config, user, isDeveloper = false, selectedGuild }: AppSidebarProps) {
  const followerConfig = { ...DEFAULT_MOUSE_FOLLOWER_CONFIG, ...config }
  const navigate = useNavigate()

  const displayName = user ? (user.globalName ?? user.username) : '…'
  const displayHandle = user ? `@${user.username}` : ''
  const initials = displayName.slice(0, 2).toUpperCase()
  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.discordUserId}/${user.avatar}.png?size=64`
    : undefined

  const handleLogout = async () => {
    await apiRequest('/auth/logout', { method: 'POST' })
    navigate({ to: '/login' })
  }

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(SIDEBAR_KEY) === 'true'
  })
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const bigBunnyX = useMotionValue(0)
  const smallBunnyX = useMotionValue(0)
  const smallBunnyY = useMotionValue(0)
  const springBigX = useSpring(bigBunnyX, { stiffness: 30, damping: 20 })
  const springSmallX = useSpring(smallBunnyX, { stiffness: 50, damping: 25 })
  const springSmallY = useSpring(smallBunnyY, { stiffness: 50, damping: 25 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (sidebarRef.current) {
        const rect = sidebarRef.current.getBoundingClientRect()
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    if (sidebarRef.current) {
      const rect = sidebarRef.current.getBoundingClientRect()
      bigBunnyX.set(mousePos.x - rect.width / 2)
      smallBunnyX.set(mousePos.x - rect.width / 2 + 20)
      smallBunnyY.set(mousePos.y - rect.height / 2)
    }
  }, [mousePos, bigBunnyX, smallBunnyX, smallBunnyY])

  const toggle = useCallback(() => {
    setCollapsed(v => {
      const next = !v
      localStorage.setItem(SIDEBAR_KEY, String(next))
      return next
    })
  }, [])

  const noGuild = !selectedGuild

  const serverNavItems: NavItemDef[] = [
    {
      href: '/dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
      label: 'Overview',
    },
    {
      href: noGuild ? '#' : `/guilds/${selectedGuild}/bot`,
      icon: <Bot className="h-4 w-4" />,
      label: 'Bot Modules',
      disabled: noGuild,
    },
    {
      href: noGuild ? '#' : `/guilds/${selectedGuild}/custom-commands`,
      icon: <TerminalSquare className="h-4 w-4" />,
      label: 'Custom Commands',
      disabled: noGuild,
    },
    {
      href: noGuild ? '#' : `/guilds/${selectedGuild}/applications`,
      icon: <FileText className="h-4 w-4" />,
      label: 'Applications',
      disabled: noGuild,
    },
    {
      href: noGuild ? '#' : `/guilds/${selectedGuild}/tickets`,
      icon: <Ticket className="h-4 w-4" />,
      label: 'Tickets',
      disabled: noGuild,
    },
  ]

  return (
    <TooltipProvider delayDuration={0}>
      <div
        ref={sidebarRef}
        className={cn(
          'flex flex-col h-full bg-sidebar border-r border-sidebar-border overflow-hidden relative',
          'transition-[width] duration-200 ease-linear shrink-0',
          collapsed ? 'w-[3.25rem]' : 'w-[15rem]'
        )}
      >
        {/* Mouse-following bunnies */}
        {followerConfig.enabled && (
          <>
            {followerConfig.showLargeBunny && (
              <motion.div
                className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: '50%', top: '50%', x: springBigX,
                  opacity: followerConfig.largeBunnyOpacity,
                  transform: `scale(${followerConfig.largeBunnyScale})`,
                }}
              >
                <BunnyMascot size="md" animated glow />
              </motion.div>
            )}
            {followerConfig.showSmallBunny && (
              <motion.div
                className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: '50%', top: '50%', x: springSmallX, y: springSmallY,
                  opacity: followerConfig.smallBunnyOpacity,
                  transform: `scale(${followerConfig.smallBunnyScale})`,
                }}
              >
                <BunnyMascot size="sm" animated />
              </motion.div>
            )}
          </>
        )}

        {/* Header */}
        <div className={cn(
          'flex items-center gap-2 shrink-0 border-b border-sidebar-border h-[52px] px-3 relative z-10',
          collapsed && 'justify-center px-2'
        )}>
          {!collapsed && (
            <>
              <BunnyMascot size="sm" animated glow />
              <span className="flex-1 font-semibold text-sm truncate">United Bunnies</span>
            </>
          )}
          {collapsed && <BunnyMascot size="sm" animated glow />}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="sm"
                className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={toggle}
              >
                <PanelLeft className={cn('h-4 w-4 transition-transform duration-200', collapsed && 'rotate-180')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Nav */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5 relative z-10">
          {!collapsed && (
            <p className="px-3 pb-1.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.15em]">
              Server Settings
            </p>
          )}
          {serverNavItems.map(item => (
            <NavItem key={item.href + item.label} item={item} collapsed={collapsed} />
          ))}

          {/* Developer portal — only shown to developers */}
          {isDeveloper && (
            <>
              {!collapsed && (
                <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.15em]">
                  Developer
                </p>
              )}
              {collapsed && <div className="my-2 mx-2 border-t border-sidebar-border" />}
              <NavItem
                item={{ href: '/developer-portal', icon: <Code2 className="h-4 w-4" />, label: 'Developer Portal' }}
                collapsed={collapsed}
              />
            </>
          )}
        </div>

        {/* Footer — user + logout */}
        <div className={cn(
          'shrink-0 border-t border-sidebar-border relative z-10',
          collapsed ? 'flex flex-col items-center gap-1 p-2' : 'p-2 space-y-0.5'
        )}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="text-[10px] bg-muted">{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{displayName} · {displayHandle}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2 rounded-lg px-2 py-2">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="text-[10px] bg-muted">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-tight truncate">{displayName}</p>
                <p className="text-[10px] text-muted-foreground leading-tight truncate">{displayHandle}</p>
              </div>
            </div>
          )}

          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="sm"
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-white/5"
                  onClick={handleLogout}>
                  <LogOut className="h-4 w-4 shrink-0" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          ) : (
            <Button type="button" variant="ghost" size="sm"
              className="w-full justify-start px-2 gap-2.5 text-muted-foreground hover:text-foreground hover:bg-white/5"
              onClick={handleLogout}>
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

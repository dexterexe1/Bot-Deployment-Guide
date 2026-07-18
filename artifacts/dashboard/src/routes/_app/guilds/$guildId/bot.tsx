import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Save, Bot, Shield, Ticket, FileText, Bell, Smile, TrendingUp, Music, MessageSquare, Terminal } from 'lucide-react'
import { BunnyMascot } from '@/components/BunnyMascot'

// Placeholder Switch component
const Switch = ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (val: boolean) => void }) => (
  <button
    onClick={() => onCheckedChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${checked ? 'bg-primary' : 'bg-muted'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
    />
  </button>
)

export const Route = createFileRoute('/_app/guilds/$guildId/bot')({
  component: GuildBotRoute,
})

interface ModuleConfig {
  moderation: boolean
  tickets: boolean
  applications: boolean
  logging: boolean
  welcome: boolean
  reactionRoles: boolean
  leveling: boolean
  music: boolean
  autoResponses: boolean
  customCommands: boolean
}

const moduleInfo = [
  { key: 'moderation', label: 'Moderation', icon: Shield, description: 'Auto-moderation, warnings, mutes, bans' },
  { key: 'tickets', label: 'Tickets', icon: Ticket, description: 'Support ticket system' },
  { key: 'applications', label: 'Applications', icon: FileText, description: 'Application forms and reviews' },
  { key: 'logging', label: 'Logging', icon: Bell, description: 'Server activity logs' },
  { key: 'welcome', label: 'Welcome', icon: Smile, description: 'Welcome messages and auto-roles' },
  { key: 'reactionRoles', label: 'Reaction Roles', icon: Smile, description: 'Emoji-based role assignment' },
  { key: 'leveling', label: 'Leveling', icon: TrendingUp, description: 'XP and level system' },
  { key: 'music', label: 'Music', icon: Music, description: 'Music playback in voice channels' },
  { key: 'autoResponses', label: 'Auto Responses', icon: MessageSquare, description: 'Automatic message responses' },
  { key: 'customCommands', label: 'Custom Commands', icon: Terminal, description: 'Custom server commands' },
]

function GuildBotRoute() {
  const { guildId } = Route.useParams()
  const [modules, setModules] = useState<ModuleConfig>({
    moderation: true, tickets: true, applications: false, logging: true, welcome: true,
    reactionRoles: true, leveling: true, music: false, autoResponses: true, customCommands: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Simulate fetch
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [guildId])

  const handleToggle = (key: keyof ModuleConfig) => {
    setModules({ ...modules, [key]: !modules[key] })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <BunnyMascot size="lg" animated />
        <div className="animate-pulse text-muted-foreground">Loading configuration...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Bot Modules</h1>
            <p className="text-sm text-muted-foreground">Enable or disable bot features for this server</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {moduleInfo.map((module, index) => {
            const Icon = module.icon
            const isEnabled = modules[module.key as keyof ModuleConfig]

            return (
              <motion.div
                key={module.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-border/60 bg-background/70 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary/10' : 'bg-muted'}`}>
                        <Icon className={`h-5 w-5 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{module.label}</CardTitle>
                        <CardDescription className="text-xs">{module.description}</CardDescription>
                      </div>
                    </div>
                    <Switch checked={isEnabled} onCheckedChange={() => handleToggle(module.key as keyof ModuleConfig)} />
                  </CardHeader>
                  <CardContent>
                    <Badge variant={isEnabled ? 'default' : 'secondary'} className="text-xs">
                      {isEnabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

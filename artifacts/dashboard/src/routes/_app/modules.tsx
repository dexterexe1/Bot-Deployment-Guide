import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/_app/modules')({
  component: ModulesPage,
})

interface Module {
  id: string
  name: string
  description: string
  icon: string
  enabled: boolean
  category: string
  premium?: boolean
}

function ModulesPage() {
  const { guildId } = Route.useParams()
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/v1/guilds/${guildId}/modules`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setModules(data.data || defaultModules)
        setLoading(false)
      })
      .catch(() => {
        setModules(defaultModules)
        setLoading(false)
      })
  }, [guildId])

  const categories = ['moderation', 'automation', 'community', 'utility']

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Modules</h1>
        <p className="text-gray-400">Enable and configure features for your server</p>
      </div>
      
      {categories.map(category => {
        const categoryModules = modules.filter(m => m.category === category)
        if (categoryModules.length === 0) return null
        
        return (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4 capitalize">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryModules.map(module => (
                <ModuleCard 
                  key={module.id} 
                  module={module} 
                  guildId={guildId}
                  onToggle={async (enabled) => {
                    await fetch(`/api/v1/guilds/${guildId}/modules`, {
                      method: 'PATCH',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ modules: { [module.id]: enabled } }),
                    })
                    setModules(modules.map(m => m.id === module.id ? { ...m, enabled } : m))
                  }}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ModuleCard({ module, guildId, onToggle }: { module: Module; guildId: string; onToggle: (enabled: boolean) => void }) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{module.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold">{module.name}</h3>
              {module.premium && <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">Premium</span>}
            </div>
            {module.enabled && <span className="text-xs text-green-400">Enabled</span>}
          </div>
        </div>
        <button
          onClick={() => onToggle(!module.enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${module.enabled ? 'bg-green-500' : 'bg-gray-600'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${module.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      <p className="text-gray-400 text-sm mb-4">{module.description}</p>
      <button
        onClick={() => window.location.href = `/app/${guildId}/${module.id}`}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors font-medium"
      >
        Configure
      </button>
    </div>
  )
}

const defaultModules: Module[] = [
  { id: 'custom-commands', name: 'Custom Commands', description: 'Create custom commands with variables, cooldowns, and permissions', icon: '⚡', enabled: false, category: 'automation' },
  { id: 'applications', name: 'Applications', description: 'Create application forms for members to fill out', icon: '📝', enabled: false, category: 'community' },
  { id: 'tickets', name: 'Tickets', description: 'Support ticket system with panels and transcripts', icon: '🎫', enabled: false, category: 'community' },
  { id: 'logging', name: 'Action Logs', description: 'Track moderation actions, joins, leaves, and more', icon: '📋', enabled: false, category: 'moderation' },
  { id: 'welcome', name: 'Welcome Messages', description: 'Automatically greet new members', icon: '👋', enabled: false, category: 'automation' },
  { id: 'autoroles', name: 'Auto Roles', description: 'Automatically assign roles when users join', icon: '👤', enabled: false, category: 'automation' },
  { id: 'moderation', name: 'Moderation', description: 'Ban, kick, mute, warn, and other moderation tools', icon: '🛡️', enabled: false, category: 'moderation' },
  { id: 'giveaways', name: 'Giveaways', description: 'Host giveaways for your server members', icon: '🎁', enabled: false, category: 'community', premium: true },
]
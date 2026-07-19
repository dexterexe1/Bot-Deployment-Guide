import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/select-server')({
  head: () => ({
    meta: [{ title: 'Select Server · United Bunnies' }],
  }),
  component: SelectServer,
})

interface Guild {
  id: string
  name: string
  icon: string | null
  memberCount: number
  permissions: number
}

function SelectServer() {
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/guilds', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setGuilds(data.data.guilds || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleAddBot = (guildId: string) => {
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID || 'YOUR_CLIENT_ID'
    const permissions = 8
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot%20applications.commands`
  }

  const handleSelectServer = (guildId: string) => {
    localStorage.setItem('dashboard_last_guild_id', guildId)
    window.location.href = `/app/${guildId}/overview`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Select a Server</h1>
        <p className="text-gray-400 mb-8">Choose a server to manage or add the bot</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guilds.map(guild => (
            <div
              key={guild.id}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              {guild.icon ? (
                <img 
                  src={guild.icon} 
                  alt={guild.name}
                  className="w-16 h-16 rounded-full mb-4"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-700 mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-400">
                    {guild.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <h3 className="text-white font-semibold text-lg mb-1">{guild.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{guild.memberCount} members</p>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleSelectServer(guild.id)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors text-sm font-medium"
                >
                  Manage
                </button>
                <button
                  onClick={() => handleAddBot(guild.id)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-md transition-colors text-sm font-medium"
                >
                  Add Bot
                </button>
              </div>
            </div>
          ))}
        </div>

        {guilds.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No servers found</p>
            <a href="https://discord.com/app" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
              Join a server and try again
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
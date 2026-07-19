import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/_app/logging')({ component: LoggingPage })

interface LogSettings { logChannelId: string; events: { [key: string]: boolean } }
interface LogEntry { _id: string; actionType: string; data: any; timestamp: number; userId: string; userName: string }

function LoggingPage() {
  const { guildId } = Route.useParams()
  const [settings, setSettings] = useState<LogSettings>({ logChannelId: '', events: { joins: true, leaves: true, bans: true, kicks: true, mutes: true, warnings: true, messages: false, commands: true, moderation: true } })
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchSettings(); fetchLogs(); fetchChannels() }, [guildId])

  const fetchSettings = async () => { try { const res = await fetch(`/api/v1/guilds/${guildId}/logging`, { credentials: 'include' }); const data = await res.json(); if (data.data) setSettings(data.data) } catch (e) { console.error(e) } }
  const fetchLogs = async () => { try { const res = await fetch(`/api/v1/guilds/${guildId}/logs?limit=50`, { credentials: 'include' }); const data = await res.json(); setLogs(data.data || []) } catch (e) { console.error(e) } finally { setLoading(false) } }
  const fetchChannels = async () => { try { const res = await fetch(`/api/v1/guilds/${guildId}/channels`, { credentials: 'include' }); const data = await res.json(); setChannels(data.data || []) } catch (e) { console.error(e) } }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    await fetch(`/api/v1/guilds/${guildId}/logging`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
    setSaving(false); alert('Settings saved!')
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-2">Action Logs</h1>
      <p className="text-gray-400 mb-8">Configure logging channels and view recent activity</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Settings</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-white font-medium mb-2">Log Channel</label>
              <select value={settings.logChannelId} onChange={e => setSettings({...settings, logChannelId: e.target.value})} className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none">
                <option value="">Select a channel</option>
                {channels.map((c: any) => <option key={c.id} value={c.id}>#{c.name}</option>)}
              </select>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-4">Log Events</h3>
              <div className="space-y-3">
                {['joins','leaves','bans','kicks','mutes','warnings','commands','moderation'].map((evt) => (
                  <div key={evt} className="flex items-center justify-between">
                    <span className="text-gray-300 capitalize">{evt.replace(/_/g,' ')}</span>
                    <button onClick={() => setSettings({...settings, events: {...settings.events, [evt]: !settings.events[evt]}})} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.events[evt] ? 'bg-green-500' : 'bg-gray-600'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.events[evt] ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">{saving ? 'Saving...' : 'Save Settings'}</button>
          </form>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            {loading ? <div className="p-6 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div> : logs.length === 0 ? <div className="p-6 text-center text-gray-400">No recent logs</div> : (
              <div className="divide-y divide-gray-700">
                {logs.map((log) => (
                  <div key={log._id} className="p-4 hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-white font-medium capitalize">{log.actionType.replace(/_/g, ' ')}</span>
                      <span className="text-gray-400 text-sm">{new Date(log.timestamp * 1000).toLocaleString()}</span>
                    </div>
                    <p className="text-gray-400 text-sm">by {log.userName || `User ${log.userId}`}</p>
                    {log.data.reason && <p className="text-gray-500 text-sm mt-1">Reason: {log.data.reason}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
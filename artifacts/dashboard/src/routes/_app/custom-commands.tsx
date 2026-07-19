import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/_app/custom-commands')({
  component: CustomCommandsPage,
})

interface CustomCommand {
  _id: string
  trigger: string
  response: string
  matchType: 'exact' | 'contains' | 'startsWith' | 'endsWith' | 'regex'
  replyType: 'text' | 'embed'
  deleteInvoke: boolean
  cooldown: number
  requiredRole: string
  permissions: string[]
  variables: string[]
  enabled: boolean
}

function CustomCommandsPage() {
  const { guildId } = Route.useParams()
  const [commands, setCommands] = useState<CustomCommand[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingCommand, setEditingCommand] = useState<CustomCommand | null>(null)

  useEffect(() => { fetchCommands() }, [guildId])

  const fetchCommands = async () => {
    try {
      const res = await fetch(`/api/v1/guilds/${guildId}/custom-commands`, { credentials: 'include' })
      const data = await res.json()
      setCommands(data.data || [])
    } catch (error) { console.error('Failed to fetch commands:', error) }
    finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this command?')) return
    await fetch(`/api/v1/guilds/${guildId}/custom-commands/${id}`, { method: 'DELETE', credentials: 'include' })
    setCommands(commands.filter(c => c._id !== id))
  }

  if (loading) return <div className="p-6 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Custom Commands</h1>
          <p className="text-gray-400">Create automated responses with advanced options</p>
        </div>
        <button onClick={() => { setEditingCommand(null); setShowEditor(true) }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
          + New Command
        </button>
      </div>

      <div className="space-y-4">
        {commands.map((cmd) => (
          <div key={cmd._id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <code className="bg-gray-700 px-3 py-1 rounded text-blue-400 font-mono">{cmd.trigger}</code>
                  <span className="text-gray-400 text-sm capitalize">{cmd.matchType}</span>
                  {cmd.cooldown > 0 && <span className="text-gray-400 text-sm">{cmd.cooldown}s cooldown</span>}
                </div>
                <p className="text-gray-300 text-sm line-clamp-2">{cmd.response}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingCommand(cmd); setShowEditor(true) }} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors">Edit</button>
                <button onClick={() => handleDelete(cmd._id)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {commands.length === 0 && (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700 border-dashed">
          <p className="text-gray-400 mb-4">No custom commands yet</p>
          <button onClick={() => setShowEditor(true)} className="text-blue-400 hover:text-blue-300 font-medium">Create your first command</button>
        </div>
      )}

      {showEditor && <CommandEditor guildId={guildId} command={editingCommand} onClose={() => setShowEditor(false)} onSave={() => { setShowEditor(false); fetchCommands() }} />}
    </div>
  )
}

function CommandEditor({ guildId, command, onClose, onSave }: { guildId: string; command: CustomCommand | null; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    trigger: command?.trigger || '', response: command?.response || '', matchType: command?.matchType || 'exact',
    replyType: command?.replyType || 'text', deleteInvoke: command?.deleteInvoke || false, cooldown: command?.cooldown || 0,
    requiredRole: command?.requiredRole || '', permissions: command?.permissions || [], variables: command?.variables || [], enabled: command?.enabled !== false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = command ? `/api/v1/guilds/${guildId}/custom-commands/${command._id}` : `/api/v1/guilds/${guildId}/custom-commands`
    const method = command ? 'PATCH' : 'POST'
    await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6">{command ? 'Edit Command' : 'Create Custom Command'}</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-white font-medium mb-2">Trigger *</label>
              <input type="text" value={formData.trigger} onChange={e => setFormData({...formData, trigger: e.target.value})} placeholder="hello" className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none" required />
            </div>
            <div>
              <label className="block text-white font-medium mb-2">Match Type</label>
              <select value={formData.matchType} onChange={e => setFormData({...formData, matchType: e.target.value as any})} className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none">
                <option value="exact">Exact Match</option><option value="contains">Contains</option><option value="startsWith">Starts With</option><option value="endsWith">Ends With</option><option value="regex">Regex</option>
              </select>
            </div>
            <div>
              <label className="block text-white font-medium mb-2">Response *</label>
              <textarea value={formData.response} onChange={e => setFormData({...formData, response: e.target.value})} placeholder="Hello {user}!" rows={4} className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none" required />
              <p className="text-gray-400 text-sm mt-2">Variables: {'{user}'}, {'{username}'}, {'{server}'}, {'{membercount}'}</p>
            </div>
            <div>
              <label className="block text-white font-medium mb-2">Reply Type</label>
              <select value={formData.replyType} onChange={e => setFormData({...formData, replyType: e.target.value as any})} className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none">
                <option value="text">Text</option><option value="embed">Embed</option>
              </select>
            </div>
            <div>
              <label className="block text-white font-medium mb-2">Cooldown (seconds)</label>
              <input type="number" value={formData.cooldown} onChange={e => setFormData({...formData, cooldown: parseInt(e.target.value) || 0})} className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none" min="0" />
            </div>
            <div>
              <label className="block text-white font-medium mb-2">Required Role ID</label>
              <input type="text" value={formData.requiredRole} onChange={e => setFormData({...formData, requiredRole: e.target.value})} placeholder="leave empty for everyone" className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="deleteInvoke" checked={formData.deleteInvoke} onChange={e => setFormData({...formData, deleteInvoke: e.target.checked})} className="rounded bg-gray-700 border-gray-600" />
              <label htmlFor="deleteInvoke" className="text-white">Delete invoking message</label>
            </div>
            <div className="flex gap-4 pt-4">
              <button type="button" onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors">Cancel</button>
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors">{command ? 'Update Command' : 'Create Command'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

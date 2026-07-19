import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/_app/customization')({
  component: CustomizationPage,
})

interface ThemeSettings {
  backgroundType: 'color' | 'image'
  backgroundColor: string
  backgroundImage: string
  cursorType: 'default' | 'custom'
  cursorUrl: string
  accentColor: string
  fontFamily: string
  logoUrl: string
}

function CustomizationPage() {
  const { guildId } = Route.useParams()
  const [settings, setSettings] = useState<ThemeSettings>({
    backgroundType: 'color',
    backgroundColor: '#111827',
    backgroundImage: '',
    cursorType: 'default',
    cursorUrl: '',
    accentColor: '#3b82f6',
    fontFamily: 'Inter, sans-serif',
    logoUrl: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewBg, setPreviewBg] = useState('#111827')

  useEffect(() => {
    fetch(`/api/v1/guilds/${guildId}/theme`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setSettings(data.data)
          setPreviewBg(data.data.backgroundType === 'color' ? data.data.backgroundColor : `url(${data.data.backgroundImage}) center/cover`)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [guildId])

  const handleImageUpload = async (file: File, field: 'backgroundImage' | 'cursorUrl' | 'logoUrl') => {
    const formData = new FormData()
    formData.append('file', file)
    
    const res = await fetch(`/api/v1/guilds/${guildId}/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    const data = await res.json()
    if (data.url) {
      setSettings(prev => ({ ...prev, [field]: data.url }))
      if (field === 'backgroundImage') setPreviewBg(`url(${data.url}) center/cover`)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/v1/guilds/${guildId}/theme`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    alert('Theme saved! Changes apply after refresh.')
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Customization</h1>
      <p className="text-gray-400 mb-8">Personalize your dashboard appearance</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Preview */}
        <div className="md:col-span-1">
          <h2 className="text-lg font-semibold text-white mb-4">Live Preview</h2>
          <div 
            className="h-64 rounded-lg border border-gray-700 flex items-center justify-center"
            style={{ background: previewBg, cursor: settings.cursorType === 'custom' ? `url(${settings.cursorUrl}), auto` : 'default' }}
          >
            <div className="bg-white/10 backdrop-blur p-4 rounded text-white text-center">
              <p className="font-bold" style={{ color: settings.accentColor }}>Preview Text</p>
              <p className="text-sm text-gray-300">Font: {settings.fontFamily.split(',')[0]}</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="md:col-span-2 space-y-6">
          {/* Background */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-white font-semibold mb-4">Background</h3>
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setSettings({...settings, backgroundType: 'color'})}
                className={`flex-1 py-2 rounded ${settings.backgroundType === 'color' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
              >
                Color
              </button>
              <button
                onClick={() => setSettings({...settings, backgroundType: 'image'})}
                className={`flex-1 py-2 rounded ${settings.backgroundType === 'image' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
              >
                Image
              </button>
            </div>
            {settings.backgroundType === 'color' ? (
              <input
                type="color"
                value={settings.backgroundColor}
                onChange={e => {
                  setSettings({...settings, backgroundColor: e.target.value})
                  setPreviewBg(e.target.value)
                }}
                className="w-full h-12 rounded cursor-pointer"
              />
            ) : (
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'backgroundImage')}
                  className="block w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-gray-700 file:text-white file:cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.backgroundImage}
                  onChange={e => {
                    setSettings({...settings, backgroundImage: e.target.value})
                    setPreviewBg(`url(${e.target.value}) center/cover`)
                  }}
                  placeholder="Or paste image URL"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600"
                />
              </div>
            )}
          </div>

          {/* Cursor */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-white font-semibold mb-4">Custom Cursor</h3>
            <select
              value={settings.cursorType}
              onChange={e => setSettings({...settings, cursorType: e.target.value as any})}
              className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 mb-3"
            >
              <option value="default">Default</option>
              <option value="custom">Custom Image</option>
            </select>
            {settings.cursorType === 'custom' && (
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/png,image/gif"
                  onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cursorUrl')}
                  className="block w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-gray-700 file:text-white file:cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.cursorUrl}
                  onChange={e => setSettings({...settings, cursorUrl: e.target.value})}
                  placeholder="Or paste cursor URL (.png/.gif)"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600"
                />
              </div>
            )}
          </div>

          {/* Accent & Font */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-white font-semibold mb-4">Accent Color</h3>
              <input
                type="color"
                value={settings.accentColor}
                onChange={e => setSettings({...settings, accentColor: e.target.value})}
                className="w-full h-12 rounded cursor-pointer"
              />
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-white font-semibold mb-4">Font Family</h3>
              <select
                value={settings.fontFamily}
                onChange={e => setSettings({...settings, fontFamily: e.target.value})}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600"
              >
                <option value="Inter, sans-serif">Inter</option>
                <option value="Roboto, sans-serif">Roboto</option>
                <option value="Poppins, sans-serif">Poppins</option>
                <option value="monospace">Monospace</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
          >
            {saving ? 'Saving...' : 'Save Theme'}
          </button>
        </div>
      </div>
    </div>
  )
}
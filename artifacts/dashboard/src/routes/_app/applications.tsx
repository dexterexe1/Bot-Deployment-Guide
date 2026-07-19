import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/_app/applications')({
  component: ApplicationsPage,
})

interface ApplicationForm {
  _id: string
  title: string
  description: string
  questions: Array<{
    id: string
    question: string
    type: 'text' | 'textarea' | 'number' | 'select'
    required: boolean
    options?: string[]
  }>
  enabled: boolean
  channelId: string
  roleId?: string
}

interface Submission {
  _id: string
  formId: string
  userId: string
  userName: string
  answers: Array<{
    questionId: string
    answer: string
  }>
  status: 'pending' | 'approved' | 'denied'
  createdAt: number
}

function ApplicationsPage() {
  const { guildId } = Route.useParams()
  const [activeTab, setActiveTab] = useState<'forms' | 'submissions'>('forms')
  const [forms, setForms] = useState<ApplicationForm[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [guildId])

  const fetchData = async () => {
    try {
      const [formsRes, submissionsRes, channelsRes] = await Promise.all([
        fetch(`/api/v1/guilds/${guildId}/applications`, { credentials: 'include' }),
        fetch(`/api/v1/guilds/${guildId}/applications/submissions`, { credentials: 'include' }),
        fetch(`/api/v1/guilds/${guildId}/channels`, { credentials: 'include' }),
      ])
      
      const formsData = await formsRes.json()
      const submissionsData = await submissionsRes.json()
      const channelsData = await channelsRes.json()
      
      setForms(formsData.data || [])
      setSubmissions(submissionsData.data || [])
      setChannels(channelsData.data || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex gap-4 mb-8 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('forms')}
          className={`pb-4 px-2 font-semibold transition-colors ${
            activeTab === 'forms'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Application Forms
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`pb-4 px-2 font-semibold transition-colors ${
            activeTab === 'submissions'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Submissions ({submissions.filter(s => s.status === 'pending').length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : activeTab === 'forms' ? (
        <ApplicationForms 
          guildId={guildId} 
          forms={forms} 
          channels={channels}
          onRefresh={fetchData}
        />
      ) : (
        <Submissions 
          guildId={guildId}
          submissions={submissions}
          forms={forms}
          onRefresh={fetchData}
        />
      )}
    </div>
  )
}

function ApplicationForms({ guildId, forms, channels, onRefresh }: { guildId: string; forms: ApplicationForm[]; channels: any[]; onRefresh: () => void }) {
  const [showEditor, setShowEditor] = useState(false)
  const [editingForm, setEditingForm] = useState<ApplicationForm | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this form?')) return
    await fetch(`/api/v1/guilds/${guildId}/applications/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    onRefresh()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Application Forms</h2>
          <p className="text-gray-400">Create forms for members to apply</p>
        </div>
        <button
          onClick={() => {
            setEditingForm(null)
            setShowEditor(true)
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          + New Form
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {forms.map((form) => (
          <div key={form._id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">{form.title}</h3>
                <p className="text-gray-400 text-sm">{form.description}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                form.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
              }`}>
                {form.enabled ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-gray-500 text-sm mb-4">{form.questions.length} questions</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingForm(form)
                  setShowEditor(true)
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(form._id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {forms.length === 0 && (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700 border-dashed">
          <p className="text-gray-400 mb-4">No application forms yet</p>
          <button
            onClick={() => setShowEditor(true)}
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            Create your first form
          </button>
        </div>
      )}

      {showEditor && (
        <FormEditor
          guildId={guildId}
          form={editingForm}
          channels={channels}
          onClose={() => setShowEditor(false)}
          onSave={() => {
            setShowEditor(false)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}

function FormEditor({ guildId, form, channels, onClose, onSave }: { guildId: string; form: ApplicationForm | null; channels: any[]; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    title: form?.title || '',
    description: form?.description || '',
    questions: form?.questions || [{ id: Date.now().toString(), question: '', type: 'text' as const, required: true }],
    channelId: form?.channelId || '',
    roleId: form?.roleId || '',
    enabled: form?.enabled !== false,
  })

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [...formData.questions, { id: Date.now().toString(), question: '', type: 'text', required: true }]
    })
  }

  const removeQuestion = (index: number) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index)
    })
  }

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...formData.questions]
    newQuestions[index] = { ...newQuestions[index], [field]: value }
    setFormData({ ...formData, questions: newQuestions })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const url = form 
      ? `/api/v1/guilds/${guildId}/applications/${form._id}`
      : `/api/v1/guilds/${guildId}/applications`
    
    const method = form ? 'PATCH' : 'POST'
    
    await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg max-w-3xl w-full my-8">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6">
            {form ? 'Edit Form' : 'Create Application Form'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-white font-medium mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="Staff Application"
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Fill out this form to apply for staff..."
                rows={3}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Notification Channel</label>
              <select
                value={formData.channelId}
                onChange={e => setFormData({...formData, channelId: e.target.value})}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select a channel</option>
                {channels.map(channel => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Questions</label>
              <div className="space-y-4">
                {formData.questions.map((q, index) => (
                  <div key={q.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={q.question}
                        onChange={e => updateQuestion(index, 'question', e.target.value)}
                        placeholder="Question text"
                        className="flex-1 bg-gray-600 text-white px-3 py-2 rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                        required
                      />
                      <select
                        value={q.type}
                        onChange={e => updateQuestion(index, 'type', e.target.value)}
                        className="bg-gray-600 text-white px-3 py-2 rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="text">Short Text</option>
                        <option value="textarea">Long Text</option>
                        <option value="number">Number</option>
                        <option value="select">Dropdown</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={e => updateQuestion(index, 'required', e.target.checked)}
                        className="rounded bg-gray-600 border-gray-500"
                      />
                      Required
                    </label>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addQuestion}
                className="mt-3 text-blue-400 hover:text-blue-300 font-medium"
              >
                + Add Question
              </button>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                {form ? 'Update Form' : 'Create Form'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function Submissions({ guildId, submissions, forms, onRefresh }: { guildId: string; submissions: Submission[]; forms: ApplicationForm[]; onRefresh: () => void }) {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)

  const handleStatusChange = async (submissionId: string, status: 'approved' | 'denied') => {
    await fetch(`/api/v1/guilds/${guildId}/applications/submissions/${submissionId}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    onRefresh()
    setSelectedSubmission(null)
  }

  const pendingSubmissions = submissions.filter(s => s.status === 'pending')
  const processedSubmissions = submissions.filter(s => s.status !== 'pending')

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Submissions</h2>
      
      {pendingSubmissions.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Pending ({pendingSubmissions.length})</h3>
          <div className="space-y-4">
            {pendingSubmissions.map((sub) => (
              <div key={sub._id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-white font-semibold">{sub.userName}</h3>
                    <p className="text-gray-400 text-sm">
                      {new Date(sub.createdAt * 1000).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                    Pending
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedSubmission(sub)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors"
                  >
                    View Application
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {processedSubmissions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Processed</h3>
          <div className="space-y-4">
            {processedSubmissions.slice(0, 10).map((sub) => (
              <div key={sub._id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-white font-semibold">{sub.userName}</h3>
                    <p className="text-gray-400 text-sm">
                      {new Date(sub.createdAt * 1000).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    sub.status === 'approved' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {sub.status === 'approved' ? 'Approved' : 'Denied'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedSubmission(sub)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {submissions.length === 0 && (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700 border-dashed">
          <p className="text-gray-400">No submissions yet</p>
        </div>
      )}

      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Application Details</h2>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-400 text-sm mb-1">Applicant</p>
                <p className="text-white font-semibold">{selectedSubmission.userName}</p>
              </div>

              <div className="mb-6">
                <p className="text-gray-400 text-sm mb-1">Submitted</p>
                <p className="text-white">
                  {new Date(selectedSubmission.createdAt * 1000).toLocaleString()}
                </p>
              </div>

              <div className="mb-6">
                <p className="text-gray-400 text-sm mb-3">Answers</p>
                <div className="space-y-4">
                  {selectedSubmission.answers.map((answer, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-4">
                      <p className="text-gray-300 text-sm mb-2">Question {index + 1}</p>
                      <p className="text-white">{answer.answer}</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedSubmission.status === 'pending' && (
                <div className="flex gap-4">
                  <button
                    onClick={() => handleStatusChange(selectedSubmission._id, 'approved')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedSubmission._id, 'denied')}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors"
                  >
                    Deny
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
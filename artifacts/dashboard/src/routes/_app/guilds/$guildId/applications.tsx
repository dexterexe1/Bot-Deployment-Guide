import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { apiRequest, isApiError } from '@/lib/api'
import { toast } from 'sonner'
import { BunnyMascot } from '@/components/BunnyMascot'
import { QuestionEditor } from '@/features/application/components/QuestionEditor'
import { StatusBadge } from '@/features/application/components/StatusBadge'
import type {
  ApplicationForm,
  ApplicationQuestion,
  ApplicationSubmission,
  GuildResourceSnapshot,
  GuildResourceChannel,
  GuildResourceRole,
} from '@/types/application'
import {
  PlusCircle,
  FileText,
  Send,
  Trash2,
  Edit2,
  ChevronLeft,
  Check,
  X,
  Clock,
  Users,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export const Route = createFileRoute('/_app/guilds/$guildId/applications')({
  component: ApplicationsPage,
})

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function textChannels(channels: GuildResourceChannel[]) {
  return channels.filter((c) => c.type === 'text' || (c as unknown as { type: number }).type === 0)
}

function roleColor(color: number | null) {
  if (!color) return '#6b7280'
  return `#${color.toString(16).padStart(6, '0')}`
}

/* ─── Form editor ─────────────────────────────────────────────────────────── */

interface FormEditorProps {
  form: ApplicationForm | null
  guildId: string
  channels: GuildResourceChannel[]
  roles: GuildResourceRole[]
  onSaved: () => void
  onCancel: () => void
}

function FormEditor({ form, guildId, channels, roles, onSaved, onCancel }: FormEditorProps) {
  const [name, setName] = useState(form?.name ?? '')
  const [description, setDescription] = useState(form?.description ?? '')
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>(form?.status ?? 'draft')
  const [targetChannelId, setTargetChannelId] = useState(form?.targetChannelId ?? '')
  const [logChannelId, setLogChannelId] = useState(form?.logChannelId ?? '')
  const [reviewerRoleIds, setReviewerRoleIds] = useState<string[]>(form?.reviewerRoleIds ?? [])
  const [questions, setQuestions] = useState<ApplicationQuestion[]>(form?.questions ?? [])
  const [buttonLabel, setButtonLabel] = useState(form?.button?.label ?? 'Apply Now')
  const [buttonStyle, setButtonStyle] = useState<'primary' | 'secondary' | 'success' | 'danger'>(
    form?.button?.style ?? 'primary',
  )
  const [embedTitle, setEmbedTitle] = useState(form?.embed?.title ?? '')
  const [embedDescription, setEmbedDescription] = useState(form?.embed?.description ?? '')
  const [embedColor, setEmbedColor] = useState(form?.embed?.color ?? '#5865F2')
  const [saving, setSaving] = useState(false)

  const toggleReviewerRole = (roleId: string) => {
    setReviewerRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    )
  }

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Form name is required'); return }

    setSaving(true)
    try {
      const targetChannel = channels.find((c) => c.id === targetChannelId)
      const logChannel = channels.find((c) => c.id === logChannelId)
      const reviewerRoleNames = roles
        .filter((r) => reviewerRoleIds.includes(r.id))
        .map((r) => r.name)

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        status,
        targetChannelId: targetChannelId || null,
        targetChannelName: targetChannel?.name ?? null,
        logChannelId: logChannelId || null,
        logChannelName: logChannel?.name ?? null,
        reviewerRoleIds,
        reviewerRoleNames,
        button: { label: buttonLabel, style: buttonStyle, emoji: null },
        embed: {
          title: embedTitle || null,
          description: embedDescription || null,
          color: embedColor || null,
          footer: null,
        },
        questions,
      }

      if (form) {
        const r = await apiRequest(`/guilds/${guildId}/applications/forms/${form.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        if (isApiError(r)) throw new Error(r.error.message)
        toast.success('Application form updated')
      } else {
        const r = await apiRequest(`/guilds/${guildId}/applications/forms`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        if (isApiError(r)) throw new Error(r.error.message)
        toast.success('Application form created')
      }
      onSaved()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save form')
    } finally {
      setSaving(false)
    }
  }

  const btnColors: Record<string, string> = {
    primary: 'bg-blue-500 text-white',
    secondary: 'bg-gray-500 text-white',
    success: 'bg-green-500 text-white',
    danger: 'bg-red-500 text-white',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h2 className="text-xl font-semibold">{form ? 'Edit Application Form' : 'New Application Form'}</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left — settings */}
        <div className="lg:col-span-3 space-y-6">
          {/* Basic info */}
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Form Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Form Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Staff Application" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Apply to join our staff team!"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft — not accepting yet</SelectItem>
                    <SelectItem value="active">Active — open for applications</SelectItem>
                    <SelectItem value="archived">Archived — closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Channel / role routing */}
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Routing</CardTitle>
              <CardDescription>Where submissions go and who reviews them</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Submit Panel Channel</Label>
                <Select value={targetChannelId} onValueChange={setTargetChannelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a channel…" />
                  </SelectTrigger>
                  <SelectContent>
                    {textChannels(channels).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        #{c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The bot will post the apply button here.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Review / Log Channel</Label>
                <Select value={logChannelId} onValueChange={setLogChannelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a channel…" />
                  </SelectTrigger>
                  <SelectContent>
                    {textChannels(channels).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        #{c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  New submissions are posted here for your staff to review.
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Reviewer Roles</Label>
                <p className="text-xs text-muted-foreground">These roles can accept / reject submissions.</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {roles
                    .filter((r) => !r.managed && r.name !== '@everyone')
                    .map((role) => (
                      <div key={role.id} className="flex items-center gap-3">
                        <Switch
                          checked={reviewerRoleIds.includes(role.id)}
                          onCheckedChange={() => toggleReviewerRole(role.id)}
                        />
                        <span
                          className="text-sm font-medium"
                          style={{ color: roleColor(role.color) }}
                        >
                          {role.name}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Panel appearance */}
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Panel Appearance</CardTitle>
              <CardDescription>How the embed and button look in Discord</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Button Label</Label>
                  <Input value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} placeholder="Apply Now" />
                </div>
                <div className="space-y-2">
                  <Label>Button Color</Label>
                  <Select value={buttonStyle} onValueChange={(v) => setButtonStyle(v as typeof buttonStyle)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary (Blue)</SelectItem>
                      <SelectItem value="secondary">Secondary (Grey)</SelectItem>
                      <SelectItem value="success">Success (Green)</SelectItem>
                      <SelectItem value="danger">Danger (Red)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Embed Title</Label>
                <Input value={embedTitle} onChange={(e) => setEmbedTitle(e.target.value)} placeholder="Staff Applications Open!" />
              </div>
              <div className="space-y-2">
                <Label>Embed Description</Label>
                <Textarea
                  value={embedDescription}
                  onChange={(e) => setEmbedDescription(e.target.value)}
                  placeholder="Click the button below to apply…"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Embed Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={embedColor}
                    onChange={(e) => setEmbedColor(e.target.value)}
                    className="h-9 w-14 rounded border border-input cursor-pointer"
                  />
                  <Input value={embedColor} onChange={(e) => setEmbedColor(e.target.value)} className="font-mono" />
                </div>
              </div>

              {/* Live preview */}
              <div className="rounded-lg bg-[#36393f] p-4 space-y-3">
                <div className="border-l-4 pl-3 py-1" style={{ borderColor: embedColor }}>
                  {embedTitle && <p className="text-white font-semibold text-sm">{embedTitle}</p>}
                  {embedDescription && (
                    <p className="text-gray-300 text-xs mt-1 whitespace-pre-wrap">{embedDescription}</p>
                  )}
                </div>
                <button className={`${btnColors[buttonStyle]} px-4 py-2 rounded text-sm font-medium`}>
                  {buttonLabel || 'Apply Now'}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Questions</CardTitle>
              <CardDescription>These appear in the modal when a member clicks the button.</CardDescription>
            </CardHeader>
            <CardContent>
              <QuestionEditor questions={questions} onChange={setQuestions} />
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : form ? 'Save changes' : 'Create form'}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>

        {/* Right — tips */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">How it works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <div className="flex gap-2">
                <span className="text-primary font-bold shrink-0">1.</span>
                <p>Create the form and set it to <strong>Active</strong>.</p>
              </div>
              <div className="flex gap-2">
                <span className="text-primary font-bold shrink-0">2.</span>
                <p>Click <strong>Send Panel</strong> to post the embed + button to the selected channel.</p>
              </div>
              <div className="flex gap-2">
                <span className="text-primary font-bold shrink-0">3.</span>
                <p>Members click the button, fill in the questions, and submit.</p>
              </div>
              <div className="flex gap-2">
                <span className="text-primary font-bold shrink-0">4.</span>
                <p>The submission appears in the <strong>review channel</strong>. Staff can accept or reject from the Submissions tab.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ─── Submissions list ────────────────────────────────────────────────────── */

function SubmissionsTab({ guildId }: { guildId: string }) {
  const { data: submissions = [], isLoading } = useQuery<ApplicationSubmission[]>({
    queryKey: ['applications-submissions', guildId],
    queryFn: async () => {
      const r = await apiRequest<{ submissions: ApplicationSubmission[] }>(
        `/guilds/${guildId}/applications/submissions`,
      )
      if (isApiError(r)) return []
      return r.data.submissions ?? []
    },
  })

  const qc = useQueryClient()

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const r = await apiRequest(`/guilds/${guildId}/applications/submissions/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      if (isApiError(r)) throw new Error(r.error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications-submissions', guildId] })
      toast.success('Status updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <BunnyMascot size="md" animated />
        <p className="text-muted-foreground text-sm animate-pulse">Loading submissions…</p>
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <Card className="border-dashed border-border/60">
        <CardContent className="py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No submissions yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Once members apply, their submissions will appear here for review.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {submissions.map((sub) => (
        <Card key={sub.id} className="border-border/60 bg-background/70 backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm">{sub.applicant.globalName ?? sub.applicant.username}</p>
                <p className="text-xs text-muted-foreground">@{sub.applicant.username}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Form: {sub.formName} ·{' '}
                  {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })}
                </p>
              </div>
              <StatusBadge status={sub.status} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Quick answers preview */}
            <div className="space-y-1 mb-3">
              {sub.answers.slice(0, 2).map((a) => (
                <div key={a.questionId}>
                  <p className="text-[11px] text-muted-foreground font-medium">{a.questionTitle}</p>
                  <p className="text-xs">{a.renderedValue}</p>
                </div>
              ))}
              {sub.answers.length > 2 && (
                <p className="text-xs text-muted-foreground">+{sub.answers.length - 2} more questions</p>
              )}
            </div>

            {/* Action buttons for pending / reviewing */}
            {(sub.status === 'pending' || sub.status === 'reviewing') && (
              <div className="flex gap-2 flex-wrap">
                {sub.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => statusMutation.mutate({ id: sub.id, status: 'reviewing' })}
                  >
                    <Clock className="h-3 w-3" />
                    Mark reviewing
                  </Button>
                )}
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                  onClick={() => statusMutation.mutate({ id: sub.id, status: 'accepted' })}
                >
                  <Check className="h-3 w-3" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs gap-1"
                  onClick={() => statusMutation.mutate({ id: sub.id, status: 'rejected' })}
                >
                  <X className="h-3 w-3" />
                  Reject
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/* ─── Main page ───────────────────────────────────────────────────────────── */

function ApplicationsPage() {
  const { guildId } = Route.useParams()
  const qc = useQueryClient()
  const [editingForm, setEditingForm] = useState<ApplicationForm | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [deploying, setDeploying] = useState<string | null>(null)

  const { data: forms = [], isLoading: formsLoading } = useQuery<ApplicationForm[]>({
    queryKey: ['application-forms', guildId],
    queryFn: async () => {
      const r = await apiRequest<{ forms: ApplicationForm[] }>(
        `/guilds/${guildId}/applications/forms`,
      )
      if (isApiError(r)) return []
      return r.data.forms ?? []
    },
  })

  const { data: resources } = useQuery<GuildResourceSnapshot>({
    queryKey: ['guild-resources', guildId],
    queryFn: async () => {
      const r = await apiRequest<GuildResourceSnapshot>(`/guilds/${guildId}/resources`)
      if (isApiError(r)) throw new Error(r.error.message)
      return r.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (formId: string) => {
      const r = await apiRequest(`/guilds/${guildId}/applications/forms/${formId}`, {
        method: 'DELETE',
      })
      if (isApiError(r)) throw new Error(r.error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application-forms', guildId] })
      toast.success('Form deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleDeploy = async (form: ApplicationForm) => {
    if (!form.targetChannelId) {
      toast.error('Set a "Submit Panel Channel" in the form editor first')
      return
    }
    setDeploying(form.id)
    try {
      const r = await apiRequest(`/guilds/${guildId}/applications/forms/${form.id}/deploy`, {
        method: 'POST',
        body: JSON.stringify({ targetChannelId: form.targetChannelId }),
      })
      if (isApiError(r)) throw new Error(r.error.message)
      qc.invalidateQueries({ queryKey: ['application-forms', guildId] })
      toast.success('Panel marked as deployed — the bot will post the embed on next sync')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to deploy')
    } finally {
      setDeploying(null)
    }
  }

  if (creatingNew || editingForm) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6">
          <FormEditor
            form={editingForm}
            guildId={guildId}
            channels={resources?.channels ?? []}
            roles={resources?.roles ?? []}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ['application-forms', guildId] })
              setCreatingNew(false)
              setEditingForm(null)
            }}
            onCancel={() => {
              setCreatingNew(false)
              setEditingForm(null)
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6">

        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Applications</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create application forms, send panels to Discord, and review submissions.
            </p>
          </div>
          <Button onClick={() => setCreatingNew(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Form
          </Button>
        </div>

        <Tabs defaultValue="forms">
          <TabsList className="bg-background/60 border border-border/60">
            <TabsTrigger value="forms">Forms</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
          </TabsList>

          {/* ── Forms tab ── */}
          <TabsContent value="forms" className="space-y-4 mt-4">
            {formsLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <BunnyMascot size="md" animated />
                <p className="text-muted-foreground text-sm animate-pulse">Loading forms…</p>
              </div>
            )}

            {!formsLoading && forms.length === 0 && (
              <Card className="border-dashed border-border/60">
                <CardContent className="py-16 flex flex-col items-center gap-4">
                  <div className="rounded-full bg-muted p-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">No application forms yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create a form, add questions, then send the panel to a Discord channel.
                    </p>
                  </div>
                  <Button onClick={() => setCreatingNew(true)} variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create first form
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {forms.map((form) => (
                <Card key={form.id} className="border-border/60 bg-background/70 backdrop-blur flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{form.name}</CardTitle>
                        {form.description && (
                          <CardDescription className="mt-0.5 line-clamp-2">{form.description}</CardDescription>
                        )}
                      </div>
                      <StatusBadge status={form.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3 pt-0">
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>{form.questions.length} question{form.questions.length !== 1 ? 's' : ''}</p>
                      {form.targetChannelName && <p>Panel → #{form.targetChannelName}</p>}
                      {form.logChannelName && <p>Reviews → #{form.logChannelName}</p>}
                      {form.deployedAt && (
                        <p>
                          Sent {formatDistanceToNow(new Date(form.deployedAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>

                    {/* Counts */}
                    {form.counts && (
                      <div className="flex gap-2 flex-wrap">
                        {form.counts.pending > 0 && (
                          <Badge variant="outline" className="text-[11px] border-yellow-500/40 text-yellow-400">
                            {form.counts.pending} pending
                          </Badge>
                        )}
                        {form.counts.reviewing > 0 && (
                          <Badge variant="outline" className="text-[11px] border-blue-500/40 text-blue-400">
                            {form.counts.reviewing} reviewing
                          </Badge>
                        )}
                        {form.counts.accepted > 0 && (
                          <Badge variant="outline" className="text-[11px] border-green-500/40 text-green-400">
                            {form.counts.accepted} accepted
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 pt-1 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setEditingForm(form)}
                      >
                        <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        disabled={deploying === form.id || form.status !== 'active'}
                        onClick={() => handleDeploy(form)}
                        title={
                          form.status !== 'active'
                            ? 'Set status to Active first'
                            : !form.targetChannelId
                            ? 'Set a submit channel in the editor first'
                            : 'Send panel to Discord'
                        }
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        {deploying === form.id ? 'Sending…' : 'Send Panel'}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{form.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes the form and all its submissions permanently.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteMutation.mutate(form.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Submissions tab ── */}
          <TabsContent value="submissions" className="mt-4">
            <SubmissionsTab guildId={guildId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export type ApplicationStatus = 'draft' | 'active' | 'archived'
export type ApplicationButtonStyle = 'primary' | 'secondary' | 'success' | 'danger'
export type ApplicationQuestionType = 'short_text' | 'paragraph' | 'multiple_choice' | 'yes_no'
export type ApplicationSubmissionStatus = 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'waitlisted' | 'withdrawn'

export interface SessionUser {
  discordUserId: string
  username: string
  globalName: string | null
  avatar: string | null
}

export interface ApplicationQuestionOption {
  id: string
  label: string
}

export interface ApplicationQuestion {
  id: string
  title: string
  description: string | null
  type: ApplicationQuestionType
  required: boolean
  order: number
  options: ApplicationQuestionOption[]
}

export interface ApplicationPanelButton {
  label: string
  style: ApplicationButtonStyle
  emoji: string | null
}

export interface ApplicationPanelEmbed {
  title: string | null
  description: string | null
  color: string | null
  footer: string | null
}

export interface ApplicationForm {
  id: string
  guildId: string
  name: string
  slug: string
  description: string | null
  status: ApplicationStatus
  targetChannelId: string | null
  targetChannelName: string | null
  logChannelId: string | null
  logChannelName: string | null
  reviewerRoleIds: string[]
  reviewerRoleNames: string[]
  button: ApplicationPanelButton
  embed: ApplicationPanelEmbed
  questions: ApplicationQuestion[]
  messageId: string | null
  deployedAt: string | null
  lastSyncedAt: string | null
  premiumFeature: boolean
  createdAt: string
  updatedAt: string
  counts?: ApplicationCounts
}

export interface ApplicationCounts {
  pending: number
  reviewing: number
  accepted: number
  rejected: number
  waitlisted: number
  total: number
}

export interface ApplicationAnswer {
  questionId: string
  questionTitle: string
  questionType: ApplicationQuestionType
  value: string | boolean | string[]
  renderedValue: string
}

export interface ApplicationReviewerNote {
  id: string
  content: string
  createdAt: string
  author: SessionUser
}

export interface ApplicationHistoryEvent {
  id: string
  type: 'submitted' | 'status_changed' | 'note_added' | 'note_deleted' | 'reviewed' | 'form_updated' | 'panel_deployed'
  message: string
  createdAt: string
  actor: SessionUser | null
  metadata: Record<string, string | number | boolean | null>
}

export interface ApplicationSubmission {
  id: string
  guildId: string
  formId: string
  formName: string
  status: ApplicationSubmissionStatus
  applicant: SessionUser
  answers: ApplicationAnswer[]
  notes: ApplicationReviewerNote[]
  history: ApplicationHistoryEvent[]
  reviewedAt: string | null
  latestNote: string | null
  createdAt: string
  updatedAt: string
}

export interface GuildResourceChannel {
  id: string
  name: string
  type: 'text' | 'voice' | 'forum' | 'announcement' | 'stage' | 'unknown'
  parentId: string | null
  parentName: string | null
  position: number
}

export interface GuildResourceCategory {
  id: string
  name: string
  position: number
}

export interface GuildResourceRole {
  id: string
  name: string
  color: number | null
  managed: boolean
  position: number
}

export interface GuildResourceSnapshot {
  id: string
  guildId: string
  fetchedAt: string | null
  channels: GuildResourceChannel[]
  categories: GuildResourceCategory[]
  roles: GuildResourceRole[]
}

export interface GuildSummary {
  id: string
  name: string
  icon: string | null
  permissions: string
}

export interface GuildOverview {
  guild: {
    id: string
    name: string
    iconUrl: string | null
    ownerId: string | null
  }
  stats: {
    memberCount: number | null
    channelCount: number | null
    roleCount: number | null
  }
  bot: {
    status: 'online' | 'offline' | null
    latencyMs: number | null
    joinedAt: string | null
  }
  meta: { dashboardVersion: string }
  recentActivity: unknown[]
}

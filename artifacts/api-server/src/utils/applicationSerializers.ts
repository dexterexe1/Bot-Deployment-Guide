import type {
  ApplicationAnswer,
  ApplicationFormDetail,
  ApplicationFormSummary,
  ApplicationHistoryEvent,
  ApplicationReviewerNote,
  ApplicationSubmissionDetail,
  ApplicationSubmissionSummary,
  GuildResourceSnapshot,
  SessionUser,
} from "../../shared/types.js"

type DateLike = Date | string | null | undefined

type ApplicationCounts = ApplicationFormSummary["counts"]
type QuestionInput = {
  id: string
  title: string
  description?: string | null
  type: ApplicationFormDetail["questions"][number]["type"]
  required: boolean
  order: number
  options?: Array<{
    id: string
    label: string
  }>
}

type SubmissionAnswerInput = {
  questionId: string
  questionTitle: string
  questionType: ApplicationAnswer["questionType"]
  value: ApplicationAnswer["value"]
  renderedValue: string
}

type ReviewerNoteInput = {
  id: string
  content: string
  createdAt: DateLike
  author: SessionUser
}

type HistoryEventInput = {
  id: string
  type: ApplicationHistoryEvent["type"]
  message: string
  createdAt: DateLike
  actor?: SessionUser | null
  metadata?: unknown
}

type ResourceChannelInput = {
  id: string
  name: string
  type: string
  parentId?: string | null
  parentName?: string | null
  position: number
}

type ResourceCategoryInput = {
  id: string
  name: string
  position: number
}

type ResourceRoleInput = {
  id: string
  name: string
  color?: number | null
  managed: boolean
  position: number
}

type ApplicationFormSummaryInput = {
  _id: { toString(): string } | string
  guildId: string
  name: string
  slug: string
  description?: string | null
  status: "draft" | "active" | "archived"
  questions?: QuestionInput[]
  targetChannelId?: string | null
  targetChannelName?: string | null
  logChannelId?: string | null
  logChannelName?: string | null
  reviewerRoleIds?: string[]
  reviewerRoleNames?: string[]
  button: ApplicationFormSummary["button"]
  embed: ApplicationFormSummary["embed"]
  messageId?: string | null
  createdAt: DateLike
  updatedAt: DateLike
}

type ApplicationSubmissionSummaryInput = {
  _id: { toString(): string } | string
  guildId: string
  formId: string
  formName: string
  status: ApplicationSubmissionSummary["status"]
  applicant: SessionUser
  createdAt: DateLike
  updatedAt: DateLike
  reviewedAt?: DateLike
  latestNote?: string | null
}

const allowedChannelTypes = new Set<GuildResourceSnapshot["channels"][number]["type"]>([
  "text",
  "voice",
  "forum",
  "announcement",
  "stage",
  "unknown",
])

function toIsoString(value: DateLike) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function toMetadataRecord(value: unknown): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  const metadata: Record<string, string | number | boolean | null> = {}

  for (const [key, entry] of Object.entries(value)) {
    if (
      typeof entry === "string" ||
      typeof entry === "number" ||
      typeof entry === "boolean" ||
      entry === null
    ) {
      metadata[key] = entry
    }
  }

  return metadata
}

export function serializeSessionUser(user: {
  discordUserId: string
  username: string
  globalName?: string | null
  avatar?: string | null
}): SessionUser {
  return {
    discordUserId: user.discordUserId,
    username: user.username,
    globalName: user.globalName ?? null,
    avatar: user.avatar ?? null,
  }
}

function serializeAnswer(answer: {
  questionId: string
  questionTitle: string
  questionType: ApplicationAnswer["questionType"]
  value: ApplicationAnswer["value"]
  renderedValue: string
}): ApplicationAnswer {
  return {
    questionId: answer.questionId,
    questionTitle: answer.questionTitle,
    questionType: answer.questionType,
    value: answer.value,
    renderedValue: answer.renderedValue,
  }
}

function serializeNote(note: {
  id: string
  content: string
  createdAt: DateLike
  author: SessionUser
}): ApplicationReviewerNote {
  return {
    id: note.id,
    content: note.content,
    createdAt: toIsoString(note.createdAt) ?? new Date(0).toISOString(),
    author: serializeSessionUser(note.author),
  }
}

function serializeHistoryEvent(event: {
  id: string
  type: ApplicationHistoryEvent["type"]
  message: string
  createdAt: DateLike
  actor?: SessionUser | null
  metadata?: unknown
}): ApplicationHistoryEvent {
  return {
    id: event.id,
    type: event.type,
    message: event.message,
    createdAt: toIsoString(event.createdAt) ?? new Date(0).toISOString(),
    actor: event.actor ? serializeSessionUser(event.actor) : null,
    metadata: toMetadataRecord(event.metadata),
  }
}

export function buildEmptyApplicationCounts(): ApplicationCounts {
  return {
    pending: 0,
    reviewing: 0,
    accepted: 0,
    rejected: 0,
    waitlisted: 0,
    total: 0,
  }
}

export function serializeApplicationFormSummary(
  form: ApplicationFormSummaryInput,
  counts: Partial<ApplicationCounts> = {},
): ApplicationFormSummary {
  const mergedCounts = { ...buildEmptyApplicationCounts(), ...counts }

  return {
    id: form._id.toString(),
    guildId: form.guildId,
    name: form.name,
    slug: form.slug,
    description: form.description ?? null,
    status: form.status,
    questionsCount: form.questions?.length ?? 0,
    targetChannelId: form.targetChannelId ?? null,
    targetChannelName: form.targetChannelName ?? null,
    logChannelId: form.logChannelId ?? null,
    logChannelName: form.logChannelName ?? null,
    reviewerRoleIds: form.reviewerRoleIds ?? [],
    reviewerRoleNames: form.reviewerRoleNames ?? [],
    button: {
      label: form.button.label,
      style: form.button.style,
      emoji: form.button.emoji ?? null,
    },
    embed: {
      title: form.embed.title ?? null,
      description: form.embed.description ?? null,
      color: form.embed.color ?? null,
      footer: form.embed.footer ?? null,
    },
    messageId: form.messageId ?? null,
    createdAt: toIsoString(form.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIsoString(form.updatedAt) ?? new Date(0).toISOString(),
    counts: {
      pending: mergedCounts.pending ?? 0,
      reviewing: mergedCounts.reviewing ?? 0,
      accepted: mergedCounts.accepted ?? 0,
      rejected: mergedCounts.rejected ?? 0,
      waitlisted: mergedCounts.waitlisted ?? 0,
      total: mergedCounts.total ?? 0,
    },
  }
}

export function serializeApplicationFormDetail(
  form: ApplicationFormSummaryInput & {
    questions: QuestionInput[]
  },
  counts: Partial<ApplicationCounts> = {},
): ApplicationFormDetail {
  return {
    ...serializeApplicationFormSummary(form, counts),
    questions: (form.questions ?? []).map((question) => ({
      id: question.id,
      title: question.title,
      description: question.description ?? null,
      type: question.type,
      required: question.required,
      order: question.order,
      options: (question.options ?? []).map((option) => ({
        id: option.id,
        label: option.label,
      })),
    })),
  }
}

export function serializeApplicationSubmissionSummary(
  form: ApplicationSubmissionSummaryInput,
): ApplicationSubmissionSummary {
  return {
    id: form._id.toString(),
    guildId: form.guildId,
    formId: form.formId,
    formName: form.formName,
    status: form.status,
    applicant: serializeSessionUser(form.applicant),
    createdAt: toIsoString(form.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIsoString(form.updatedAt) ?? new Date(0).toISOString(),
    reviewedAt: toIsoString(form.reviewedAt),
    latestNote: form.latestNote ?? null,
  }
}

export function serializeApplicationSubmissionDetail(form: ApplicationSubmissionSummaryInput & {
  answers: SubmissionAnswerInput[]
  notes: ReviewerNoteInput[]
  history: HistoryEventInput[]
}): ApplicationSubmissionDetail {
  return {
    ...serializeApplicationSubmissionSummary(form),
    answers: (form.answers ?? []).map(serializeAnswer),
    notes: (form.notes ?? []).map(serializeNote),
    history: (form.history ?? []).map(serializeHistoryEvent),
  }
}

export function serializeGuildResourceSnapshot(snapshot: {
  guildId: string
  fetchedAt?: DateLike
  channels?: ResourceChannelInput[]
  categories?: ResourceCategoryInput[]
  roles?: ResourceRoleInput[]
}): GuildResourceSnapshot {
  return {
    guildId: snapshot.guildId,
    fetchedAt: toIsoString(snapshot.fetchedAt),
    channels: (snapshot.channels ?? []).map((channel) => ({
      id: channel.id,
      name: channel.name,
      type: allowedChannelTypes.has(channel.type as GuildResourceSnapshot["channels"][number]["type"])
        ? (channel.type as GuildResourceSnapshot["channels"][number]["type"])
        : "unknown",
      parentId: channel.parentId ?? null,
      parentName: channel.parentName ?? null,
      position: channel.position,
    })),
    categories: (snapshot.categories ?? []).map((category) => ({
      id: category.id,
      name: category.name,
      position: category.position,
    })),
    roles: (snapshot.roles ?? []).map((role) => ({
      id: role.id,
      name: role.name,
      color: role.color ?? null,
      managed: role.managed,
      position: role.position,
    })),
  }
}

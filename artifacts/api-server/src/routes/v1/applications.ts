import { randomUUID } from "crypto"
import { Router } from "express"
import { z } from "zod"
import type { ApplicationSubmissionStatus } from "../../../shared/types.js"
import { ApplicationFormModel } from "../../models/ApplicationForm.js"
import { ApplicationSubmissionModel } from "../../models/ApplicationSubmission.js"
import { ApplicationLogModel } from "../../models/ApplicationLog.js"
import { requireAuth } from "../../middleware/requireAuth.js"
import { ApiError } from "../../utils/apiError.js"
import {
  buildEmptyApplicationCounts,
  serializeApplicationFormDetail,
  serializeApplicationFormSummary,
  serializeApplicationSubmissionDetail,
  serializeApplicationSubmissionSummary,
  serializeSessionUser,
} from "../../utils/applicationSerializers.js"
import { appendApplicationLog, appendSubmissionHistory } from "../../utils/applicationLogs.js"
import { getManageableGuild } from "../../utils/guildAccess.js"
import { created, ok } from "../../utils/respond.js"

const router = Router({ mergeParams: true })

const applicationQuestionOptionSchema = z.object({
  id: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(120),
})

const applicationQuestionSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(1000).nullable().optional(),
    type: z.enum(["short_text", "paragraph", "multiple_choice", "yes_no"]),
    required: z.boolean().default(true),
    order: z.number().int().min(0),
    options: z.array(applicationQuestionOptionSchema).max(25).default([]),
  })
  .superRefine((question, ctx) => {
    const optionIds = new Set<string>()

    for (const option of question.options) {
      if (optionIds.has(option.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate option id "${option.id}"`,
          path: ["options"],
        })
      }

      optionIds.add(option.id)
    }

    if (question.type === "multiple_choice" && question.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Multiple choice questions require at least two options",
        path: ["options"],
      })
    }

    if (question.type !== "multiple_choice" && question.options.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only multiple choice questions can define options",
        path: ["options"],
      })
    }
  })

const applicationButtonSchema = z.object({
  label: z.string().trim().min(1).max(80),
  style: z.enum(["primary", "secondary", "success", "danger"]),
  emoji: z.string().trim().max(32).nullable().optional(),
})

const applicationEmbedSchema = z.object({
  title: z.string().trim().max(256).nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  color: z.string().trim().max(32).nullable().optional(),
  footer: z.string().trim().max(256).nullable().optional(),
})

// Base object — keeps .partial() available for PATCH routes.
// superRefine wraps in ZodEffects which loses .partial(), so we split them.
const formPayloadBaseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  targetChannelId: z.string().trim().min(1).max(64).nullable().optional(),
  targetChannelName: z.string().trim().min(1).max(120).nullable().optional(),
  logChannelId: z.string().trim().min(1).max(64).nullable().optional(),
  logChannelName: z.string().trim().min(1).max(120).nullable().optional(),
  reviewerRoleIds: z.array(z.string().trim().min(1).max(64)).max(25).default([]),
  reviewerRoleNames: z.array(z.string().trim().min(1).max(120)).max(25).default([]),
  button: applicationButtonSchema.default({ label: "Apply Now", style: "primary", emoji: null }),
  embed: applicationEmbedSchema.default({ title: null, description: null, color: null, footer: null }),
  questions: z.array(applicationQuestionSchema).max(50).default([]),
  premiumFeature: z.boolean().default(false),
})

// Full schema with cross-field validation — used for POST (create).
const formPayloadSchema = formPayloadBaseSchema.superRefine((value, ctx) => {
  const questionIds = new Set<string>()
  const questionOrders = new Set<number>()

  for (const question of value.questions) {
    if (questionIds.has(question.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate question id "${question.id}"`,
        path: ["questions"],
      })
    }

    if (questionOrders.has(question.order)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate question order "${question.order}"`,
        path: ["questions"],
      })
    }

    questionIds.add(question.id)
    questionOrders.add(question.order)
  }

  if (value.reviewerRoleIds.length !== value.reviewerRoleNames.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Reviewer role ids and names must have matching lengths",
      path: ["reviewerRoleNames"],
    })
  }
})

// Partial schema for PATCH — derived from base before superRefine wrapping.
const formPatchSchema = formPayloadBaseSchema.partial()

const submissionStatusSchema = z.object({
  status: z.enum(["pending", "reviewing", "accepted", "rejected", "waitlisted", "withdrawn"]),
})

const submissionNoteSchema = z.object({
  content: z.string().trim().min(1).max(4000),
})

const submissionAnswerSchema = z.object({
  questionId: z.string().trim().min(1).max(64),
  value: z.union([z.string(), z.boolean(), z.array(z.string())]),
})

const submissionsQuerySchema = z.object({
  formId: z.string().trim().min(1).optional(),
  status: z.enum(["pending", "reviewing", "accepted", "rejected", "waitlisted", "withdrawn"]).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

const formLogsQuerySchema = z.object({
  formId: z.string().trim().min(1).optional(),
  submissionId: z.string().trim().min(1).optional(),
  type: z.enum(["submitted", "status_changed", "note_added", "note_deleted", "reviewed", "form_updated", "panel_deployed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

const deploymentSyncBodySchema = z.object({
  messageId: z.string().trim().min(1).max(64),
  targetChannelId: z.string().trim().min(1).max(64),
  deployedAt: z.string().datetime().optional(),
})

const submissionCreateSchema = z.object({
  formId: z.string().trim().min(1),
  applicant: z.object({
    discordUserId: z.string().trim().min(1).max(64),
    username: z.string().trim().min(1).max(120),
    globalName: z.string().trim().max(120).nullable().optional(),
    avatar: z.string().trim().max(120).nullable().optional(),
  }),
  answers: z.array(submissionAnswerSchema),
})

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function normalizeFormSlug(name: string) {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)

  return normalized || randomUUID()
}

function isReviewedStatus(status: ApplicationSubmissionStatus) {
  return status === "accepted" || status === "rejected" || status === "waitlisted" || status === "withdrawn"
}

function getGuildIdParam(params: unknown) {
  return String((params as { guildId?: string }).guildId ?? "")
}

async function loadSubmissionCounts(guildId: string, formIds: string[]) {
  const countsByForm = new Map<string, ReturnType<typeof buildEmptyApplicationCounts>>()

  if (formIds.length === 0) {
    return countsByForm
  }

  const aggregation = await ApplicationSubmissionModel.aggregate<{
    _id: { formId: string; status: ApplicationSubmissionStatus }
    count: number
  }>([
    { $match: { guildId, formId: { $in: formIds } } },
    {
      $group: {
        _id: { formId: "$formId", status: "$status" },
        count: { $sum: 1 },
      },
    },
  ])

  for (const row of aggregation) {
    const current = countsByForm.get(row._id.formId) ?? buildEmptyApplicationCounts()
    current[row._id.status] = row.count
    current.total += row.count
    countsByForm.set(row._id.formId, current)
  }

  return countsByForm
}

async function ensureUniqueSlug(guildId: string, slug: string, excludeId?: string) {
  const existing = await ApplicationFormModel.findOne({ guildId, slug }).lean()

  if (existing && existing._id.toString() !== excludeId) {
    throw new ApiError(409, "APPLICATION_FORM_SLUG_EXISTS", "An application form with that slug already exists")
  }
}

async function getGuildScopedForm(guildId: string, formId: string) {
  const form = await ApplicationFormModel.findOne({ _id: formId, guildId }).lean()

  if (!form) {
    throw new ApiError(404, "APPLICATION_FORM_NOT_FOUND", "Application form not found")
  }

  return form
}

async function getGuildScopedSubmission(guildId: string, submissionId: string) {
  const submission = await ApplicationSubmissionModel.findOne({ _id: submissionId, guildId }).lean()

  if (!submission) {
    throw new ApiError(404, "APPLICATION_SUBMISSION_NOT_FOUND", "Application submission not found")
  }

  return submission
}

router.use(requireAuth)

router.get("/forms", async (req, res, next) => {
  try {
    const guildId = getGuildIdParam(req.params)
    await getManageableGuild(req, guildId)

    const forms = await ApplicationFormModel.find({ guildId }).sort({ updatedAt: -1 }).lean()
    const countsByForm = await loadSubmissionCounts(
      guildId,
      forms.map((form) => form._id.toString()),
    )

    ok(res, {
      forms: forms.map((form) =>
        serializeApplicationFormSummary(form, countsByForm.get(form._id.toString())),
      ),
    })
  } catch (err) {
    next(err)
  }
})

router.post("/forms", async (req, res, next) => {
  try {
    const guildId = getGuildIdParam(req.params)
    await getManageableGuild(req, guildId)

    const payload = formPayloadSchema.parse(req.body)
    const slug = payload.slug ?? normalizeFormSlug(payload.name)
    await ensureUniqueSlug(guildId, slug)

    const form = await ApplicationFormModel.create({
      guildId,
      ...payload,
      slug,
    })

    await appendApplicationLog({
      guildId,
      formId: form._id.toString(),
      type: "form_updated",
      message: `Created application form "${form.name}"`,
      actor: req.session.user ?? null,
      metadata: {
        formId: form._id.toString(),
        status: form.status,
      },
    })

    created(res, {
      form: serializeApplicationFormDetail(form.toObject(), buildEmptyApplicationCounts()),
    })
  } catch (err) {
    next(err)
  }
})

router.get("/forms/:formId", async (req, res, next) => {
  try {
    const guildId = getGuildIdParam(req.params)
    await getManageableGuild(req, guildId)

    const form = await getGuildScopedForm(guildId, req.params.formId)
    const countsByForm = await loadSubmissionCounts(guildId, [form._id.toString()])

    ok(res, {
      form: serializeApplicationFormDetail(form, countsByForm.get(form._id.toString())),
    })
  } catch (err) {
    next(err)
  }
})

router.patch("/forms/:formId", async (req, res, next) => {
  try {
    const guildId = getGuildIdParam(req.params)
    await getManageableGuild(req, guildId)

    const currentForm = await getGuildScopedForm(guildId, req.params.formId)
    const patch = formPatchSchema.parse(req.body)
    const nextSlug = patch.slug ?? currentForm.slug

    if (Object.keys(patch).length === 0) {
      throw new ApiError(400, "EMPTY_UPDATE", "No application form fields were provided")
    }

    if (patch.slug || patch.name) {
      await ensureUniqueSlug(guildId, nextSlug, currentForm._id.toString())
    }

    const updated = await ApplicationFormModel.findByIdAndUpdate(
      currentForm._id,
      {
        $set: {
          ...patch,
          slug: patch.slug ?? currentForm.slug,
        },
      },
      { new: true },
    ).lean()

    if (!updated) {
      throw new ApiError(404, "APPLICATION_FORM_NOT_FOUND", "Application form not found")
    }

    await appendApplicationLog({
      guildId,
      formId: updated._id.toString(),
      type: "form_updated",
      message: `Updated application form "${updated.name}"`,
      actor: req.session.user ?? null,
      metadata: {
        formId: updated._id.toString(),
        status: updated.status,
      },
    })

    const countsByForm = await loadSubmissionCounts(guildId, [updated._id.toString()])

    ok(res, {
      form: serializeApplicationFormDetail(updated, countsByForm.get(updated._id.toString())),
    })
  } catch (err) {
    next(err)
  }
})

router.get("/submissions", async (req, res, next) => {
  try {
    const guildId = getGuildIdParam(req.params)
    await getManageableGuild(req, guildId)

    const query = submissionsQuerySchema.parse(req.query)
    const filter: Record<string, unknown> = { guildId }

    if (query.formId) {
      filter.formId = query.formId
    }

    if (query.status) {
      filter.status = query.status
    }

    if (query.search) {
      const pattern = new RegExp(escapeRegex(query.search), "i")
      filter.$or = [
        { "applicant.username": pattern },
        { "applicant.globalName": pattern },
        { "applicant.discordUserId": pattern },
        { formName: pattern },
      ]
    }

    const skip = (query.page - 1) * query.limit

    const [submissions, total] = await Promise.all([
      ApplicationSubmissionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
      ApplicationSubmissionModel.countDocuments(filter),
    ])

    ok(res, {
      submissions: submissions.map(serializeApplicationSubmissionSummary),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.max(1, Math.ceil(total / query.limit)),
      },
    })
  } catch (err) {
    next(err)
  }
})

router.get("/submissions/:submissionId", async (req, res, next) => {
  try {
    const guildId = getGuildIdParam(req.params)
    await getManageableGuild(req, guildId)

    const submission = await getGuildScopedSubmission(guildId, req.params.submissionId)

    ok(res, {
      submission: serializeApplicationSubmissionDetail(submission),
    })
  } catch (err) {
    next(err)
  }
})

router.patch("/submissions/:submissionId/status", async (req, res, next) => {
  try {
    const guildId = getGuildIdParam(req.params)
    await getManageableGuild(req, guildId)

    const payload = submissionStatusSchema.parse(req.body)
    const submission = await getGuildScopedSubmission(guildId, req.params.submissionId)

    if (submission.status === payload.status) {
      ok(res, {
        submission: serializeApplicationSubmissionDetail(submission),
      })
      return
    }

    const reviewedAt = isReviewedStatus(payload.status) ? new Date() : null

    const updated = await ApplicationSubmissionModel.findByIdAndUpdate(
      submission._id,
      {
        $set: {
          status: payload.status,
          reviewedAt,
        },
      },
      { new: true },
    ).lean()

    if (!updated) {
      throw new ApiError(404, "APPLICATION_SUBMISSION_NOT_FOUND", "Application submission not found")
    }

    const actor = req.session.user ?? null
    const statusMessage = `Updated submission status from ${submission.status} to ${payload.status}`

    await Promise.all([
      appendApplicationLog({
        guildId,
        formId: updated.formId,
        submissionId: updated._id.toString(),
        type: "status_changed",
        message: statusMessage,
        actor,
        metadata: {
          previousStatus: submission.status,
          nextStatus: payload.status,
        },
      }),
      appendSubmissionHistory(updated._id.toString(), {
        type: "status_changed",
        message: statusMessage,
        actor,
        metadata: {
          previousStatus: submission.status,
          nextStatus: payload.status,
        },
      }),
    ])

    ok(res, {
      submission: serializeApplicationSubmissionDetail(updated),
    })
  } catch (err) {
    next(err)
  }
})

router.post("/submissions/:submissionId/notes", async (req, res, next) => {
  try {
    const guildId = getGuildIdParam(req.params)
    await getManageableGuild(req, guildId)

    const actor = req.session.user
    if (!actor) {
      throw new ApiError(401, "UNAUTHENTICATED", "Authentication required")
    }

    const payload = submissionNoteSchema.parse(req.body)
    const submission = await getGuildScopedSubmission(guildId, req.params.submissionId)
    const note = {
      id: randomUUID(),
      content: payload.content,
      createdAt: new Date(),
      author: actor,
    }

    const updated = await ApplicationSubmissionModel.findByIdAndUpdate(
      submission._id,
      {
        $push: { notes: note },
        $set: { latestNote: payload.content },
      },
      { new: true },
    ).lean()

    if (!updated) {
      throw new ApiError(404, "APPLICATION_SUBMISSION_NOT_FOUND", "Application submission not found")
    }

    const message = `Added reviewer note to submission for ${updated.applicant.username}`

    await Promise.all([
      appendApplicationLog({
        guildId,
        formId: updated.formId,
        submissionId: updated._id.toString(),
        type: "note_added",
        message,
        actor,
        metadata: {
          noteId: note.id,
        },
      }),
      appendSubmissionHistory(updated._id.toString(), {
        type: "note_added",
        message,
        actor,
        metadata: {
          noteId: note.id,
        },
      }),
    ])

    ok(res, {
      submission: serializeApplicationSubmissionDetail(updated),
    })
  } catch (err) {
    next(err)
  }
})

router.delete("/submissions/:submissionId/notes/:noteId", async (req, res, next) => {
  try {
    const guildId = getGuildIdParam(req.params)
    await getManageableGuild(req, guildId)

    const actor = req.session.user
    if (!actor) {
      throw new ApiError(401, "UNAUTHENTICATED", "Authentication required")
    }

    const submissionDocument = await ApplicationSubmissionModel.findOne({
      _id: req.params.submissionId,
      guildId,
    })

    if (!submissionDocument) {
      throw new ApiError(404, "APPLICATION_SUBMISSION_NOT_FOUND", "Application submission not found")
    }

    const noteIndex = submissionDocument.notes.findIndex((note) => note.id === req.params.noteId)
    if (noteIndex === -1) {
      throw new ApiError(404, "APPLICATION_NOTE_NOT_FOUND", "Application note not found")
    }

    submissionDocument.notes.splice(noteIndex, 1)
    submissionDocument.latestNote =
      submissionDocument.notes.length > 0
        ? submissionDocument.notes[submissionDocument.notes.length - 1]?.content ?? null
        : null

    await submissionDocument.save()

    const message = `Deleted reviewer note from submission for ${submissionDocument.applicant.username}`

    await Promise.all([
      appendApplicationLog({
        guildId,
        formId: submissionDocument.formId,
        submissionId: submissionDocument._id.toString(),
        type: "note_deleted",
        message,
        actor,
        metadata: {
          noteId: req.params.noteId,
        },
      }),
      appendSubmissionHistory(submissionDocument._id.toString(), {
        type: "note_deleted",
        message,
        actor,
        metadata: {
          noteId: req.params.noteId,
        },
      }),
    ])

    ok(res, {
      submission: serializeApplicationSubmissionDetail(submissionDocument.toObject()),
    })
  } catch (err) {
    next(err)
  }
})

router.post("/forms/:formId/deploy", async (req, res, next) => {
  try {
    const guildId = getGuildIdParam(req.params)
    await getManageableGuild(req, guildId)

    const form = await getGuildScopedForm(guildId, req.params.formId)
    const payload = deploymentSyncBodySchema.parse(req.body)

    if (!form.targetChannelId) {
      throw new ApiError(400, "APPLICATION_FORM_NO_TARGET_CHANNEL", "Application form has no target channel configured")
    }

    const updated = await ApplicationFormModel.findByIdAndUpdate(
      form._id,
      {
        $set: {
          messageId: payload.messageId,
          deployedAt: payload.deployedAt ? new Date(payload.deployedAt) : new Date(),
          lastSyncedAt: new Date(),
        },
      },
      { new: true },
    ).lean()

    if (!updated) {
      throw new ApiError(404, "APPLICATION_FORM_NOT_FOUND", "Application form not found")
    }

    await appendApplicationLog({
      guildId,
      formId: updated._id.toString(),
      type: "panel_deployed",
      message: `Deployed application panel for "${updated.name}" to <#${payload.targetChannelId}>`,
      actor: req.session.user ?? null,
      metadata: {
        messageId: payload.messageId,
        targetChannelId: payload.targetChannelId,
      },
    })

    ok(res, {
      form: serializeApplicationFormDetail(updated, buildEmptyApplicationCounts()),
    })
  } catch (err) {
    next(err)
  }
})

router.post("/submissions", async (req, res, next) => {
  try {
    const guildId = getGuildIdParam(req.params)
    await getManageableGuild(req, guildId)

    const payload = submissionCreateSchema.parse(req.body)
    const form = await getGuildScopedForm(guildId, payload.formId)

    if (form.status !== "active") {
      throw new ApiError(400, "APPLICATION_FORM_NOT_ACTIVE", "This application form is not accepting submissions")
    }

    const existingSubmission = await ApplicationSubmissionModel.findOne({
      guildId,
      formId: form._id.toString(),
      "applicant.discordUserId": payload.applicant.discordUserId,
      status: { $in: ["pending", "reviewing"] },
    }).lean()

    if (existingSubmission) {
      throw new ApiError(409, "APPLICATION_SUBMISSION_EXISTS", "You have already submitted an application that is pending review")
    }

    const questionMap = new Map(form.questions.map((q) => [q.id, q]))
    const answers: Array<{
      questionId: string
      questionTitle: string
      questionType: "short_text" | "paragraph" | "multiple_choice" | "yes_no"
      value: string | boolean | string[]
      renderedValue: string
    }> = []

    for (const answerInput of payload.answers) {
      const question = questionMap.get(answerInput.questionId)
      if (!question) {
        throw new ApiError(400, "APPLICATION_QUESTION_NOT_FOUND", `Question with id "${answerInput.questionId}" not found`)
      }

      const value = answerInput.value
      let renderedValue = String(value)

      if (question.type === "multiple_choice" && Array.isArray(value)) {
        const selectedOptions = form.questions
          .find((q) => q.id === question.id)?.options ?? []
        renderedValue = value
          .map((optId) => selectedOptions.find((o) => o.id === optId)?.label ?? optId)
          .join(", ")
      } else if (question.type === "yes_no" && typeof value === "boolean") {
        renderedValue = value ? "Yes" : "No"
      }

      answers.push({
        questionId: question.id,
        questionTitle: question.title,
        questionType: question.type,
        value,
        renderedValue,
      })
    }

    for (const question of form.questions) {
      if (question.required) {
        const providedAnswer = answers.find((a) => a.questionId === question.id)
        if (!providedAnswer) {
          throw new ApiError(400, "APPLICATION_MISSING_REQUIRED_ANSWER", `Missing required answer for question "${question.title}"`)
        }
      }
    }

    const submission = await ApplicationSubmissionModel.create({
      guildId,
      formId: form._id.toString(),
      formName: form.name,
      status: "pending",
      applicant: {
        discordUserId: payload.applicant.discordUserId,
        username: payload.applicant.username,
        globalName: payload.applicant.globalName ?? null,
        avatar: payload.applicant.avatar ?? null,
      },
      answers,
      notes: [],
      history: [],
    })

    await appendSubmissionHistory(submission._id.toString(), {
      type: "submitted",
      message: `Application submitted for ${payload.applicant.username}`,
      actor: req.session.user ?? null,
      metadata: {},
    })

    await appendApplicationLog({
      guildId,
      formId: form._id.toString(),
      submissionId: submission._id.toString(),
      type: "submitted",
      message: `New application submitted by ${payload.applicant.username} for "${form.name}"`,
      actor: req.session.user ?? null,
      metadata: {
        submissionId: submission._id.toString(),
      },
    })

    created(res, {
      submission: serializeApplicationSubmissionDetail(submission.toObject()),
    })
  } catch (err) {
    next(err)
  }
})

router.get("/logs", async (req, res, next) => {
  try {
    const guildId = getGuildIdParam(req.params)
    await getManageableGuild(req, guildId)

    const query = formLogsQuerySchema.parse(req.query)
    const filter: Record<string, unknown> = { guildId }

    if (query.formId) {
      filter.formId = query.formId
    }

    if (query.submissionId) {
      filter.submissionId = query.submissionId
    }

    if (query.type) {
      filter.type = query.type
    }

    const skip = (query.page - 1) * query.limit

    const [logs, total] = await Promise.all([
      ApplicationLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
      ApplicationLogModel.countDocuments(filter),
    ])

    ok(res, {
      logs: logs.map((log) => ({
        id: log._id.toString(),
        guildId: log.guildId,
        formId: log.formId ?? null,
        submissionId: log.submissionId ?? null,
        type: log.type,
        message: log.message,
        actor: log.actor ? serializeSessionUser(log.actor) : null,
        metadata: log.metadata ?? {},
        createdAt: log.createdAt.toISOString(),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.max(1, Math.ceil(total / query.limit)),
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router

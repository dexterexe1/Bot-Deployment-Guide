import mongoose from "mongoose"

const submissionUserSchema = new mongoose.Schema(
  {
    discordUserId: { type: String, required: true },
    username: { type: String, required: true },
    globalName: { type: String, default: null },
    avatar: { type: String, default: null },
  },
  { _id: false },
)

const applicationAnswerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    questionTitle: { type: String, required: true },
    questionType: {
      type: String,
      enum: ["short_text", "paragraph", "multiple_choice", "yes_no"],
      required: true,
    },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    renderedValue: { type: String, required: true },
  },
  { _id: false },
)

const applicationReviewerNoteSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, required: true },
    author: { type: submissionUserSchema, required: true },
  },
  { _id: false },
)

const applicationHistoryEventSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ["submitted", "status_changed", "note_added", "note_deleted", "reviewed", "form_updated", "panel_deployed"],
      required: true,
    },
    message: { type: String, required: true },
    createdAt: { type: Date, required: true },
    actor: { type: submissionUserSchema, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
)

const applicationSubmissionSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    formId: { type: String, required: true, index: true },
    formName: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "reviewing", "accepted", "rejected", "waitlisted", "withdrawn"],
      default: "pending",
      index: true,
    },
    applicant: { type: submissionUserSchema, required: true },
    answers: { type: [applicationAnswerSchema], default: [] },
    notes: { type: [applicationReviewerNoteSchema], default: [] },
    history: { type: [applicationHistoryEventSchema], default: [] },
    reviewedAt: { type: Date, default: null },
    latestNote: { type: String, default: null },
  },
  { timestamps: true, collection: "applicationSubmissions" },
)

applicationSubmissionSchema.index({ guildId: 1, formId: 1, "applicant.discordUserId": 1, createdAt: -1 })

type ApplicationSubmissionDoc = mongoose.InferSchemaType<typeof applicationSubmissionSchema>

export const ApplicationSubmissionModel =
  (mongoose.models.ApplicationSubmission as mongoose.Model<ApplicationSubmissionDoc>) ??
  mongoose.model<ApplicationSubmissionDoc>("ApplicationSubmission", applicationSubmissionSchema)

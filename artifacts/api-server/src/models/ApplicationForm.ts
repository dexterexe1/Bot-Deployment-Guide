import mongoose from "mongoose"

const applicationQuestionOptionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false },
)

const applicationQuestionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: null },
    type: {
      type: String,
      enum: ["short_text", "paragraph", "multiple_choice", "yes_no"],
      required: true,
    },
    required: { type: Boolean, default: true },
    order: { type: Number, required: true },
    options: { type: [applicationQuestionOptionSchema], default: [] },
  },
  { _id: false },
)

const applicationPanelButtonSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    style: {
      type: String,
      enum: ["primary", "secondary", "success", "danger"],
      default: "primary",
    },
    emoji: { type: String, default: null },
  },
  { _id: false },
)

const applicationPanelEmbedSchema = new mongoose.Schema(
  {
    title: { type: String, default: null },
    description: { type: String, default: null },
    color: { type: String, default: null },
    footer: { type: String, default: null },
  },
  { _id: false },
)

const applicationFormSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, default: null },
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
      index: true,
    },
    targetChannelId: { type: String, default: null },
    targetChannelName: { type: String, default: null },
    logChannelId: { type: String, default: null },
    logChannelName: { type: String, default: null },
    reviewerRoleIds: { type: [String], default: [] },
    reviewerRoleNames: { type: [String], default: [] },
    button: {
      type: applicationPanelButtonSchema,
      default: { label: "Apply Now", style: "primary", emoji: null },
    },
    embed: {
      type: applicationPanelEmbedSchema,
      default: { title: null, description: null, color: null, footer: null },
    },
    questions: { type: [applicationQuestionSchema], default: [] },
    messageId: { type: String, default: null },
    deployedAt: { type: Date, default: null },
    lastSyncedAt: { type: Date, default: null },
    premiumFeature: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "applicationForms" },
)

applicationFormSchema.index({ guildId: 1, slug: 1 }, { unique: true })

type ApplicationFormDoc = mongoose.InferSchemaType<typeof applicationFormSchema>

export const ApplicationFormModel =
  (mongoose.models.ApplicationForm as mongoose.Model<ApplicationFormDoc>) ??
  mongoose.model<ApplicationFormDoc>("ApplicationForm", applicationFormSchema)

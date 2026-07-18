import mongoose from "mongoose"

const logActorSchema = new mongoose.Schema(
  {
    discordUserId: { type: String, required: true },
    username: { type: String, required: true },
    globalName: { type: String, default: null },
    avatar: { type: String, default: null },
  },
  { _id: false },
)

const applicationLogSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    formId: { type: String, default: null, index: true },
    submissionId: { type: String, default: null, index: true },
    type: {
      type: String,
      enum: ["submitted", "status_changed", "note_added", "note_deleted", "reviewed", "form_updated", "panel_deployed"],
      required: true,
    },
    message: { type: String, required: true },
    actor: { type: logActorSchema, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: "applicationLogs" },
)

type ApplicationLogDoc = mongoose.InferSchemaType<typeof applicationLogSchema>

export const ApplicationLogModel =
  (mongoose.models.ApplicationLog as mongoose.Model<ApplicationLogDoc>) ??
  mongoose.model<ApplicationLogDoc>("ApplicationLog", applicationLogSchema)

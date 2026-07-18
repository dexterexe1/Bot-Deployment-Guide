import mongoose from "mongoose"

const botGuildSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    icon: { type: String, required: false },
    memberCount: { type: Number, required: true },
  },
  { _id: false },
)

const botStatusSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    online: { type: Boolean, required: true },
    ping: { type: Number, required: true },
    guildCount: { type: Number, required: true },
    memberCount: { type: Number, required: true },
    guilds: { type: [botGuildSchema], required: true },
    updatedAt: { type: Date, required: true },
  },
  { versionKey: false },
)

type BotStatusDoc = mongoose.InferSchemaType<typeof botStatusSchema>

export const BotStatusModel =
  (mongoose.models.BotStatus as mongoose.Model<BotStatusDoc>) ??
  mongoose.model<BotStatusDoc>("BotStatus", botStatusSchema, "botStatus")


import mongoose from "mongoose"

const guildChannelResourceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    parentId: { type: String, default: null },
    parentName: { type: String, default: null },
    position: { type: Number, required: true },
  },
  { _id: false },
)

const guildCategoryResourceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    position: { type: Number, required: true },
  },
  { _id: false },
)

const guildRoleResourceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: Number, default: null },
    managed: { type: Boolean, required: true },
    position: { type: Number, required: true },
  },
  { _id: false },
)

const guildResourceSnapshotSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    fetchedAt: { type: Date, default: null },
    channels: { type: [guildChannelResourceSchema], default: [] },
    categories: { type: [guildCategoryResourceSchema], default: [] },
    roles: { type: [guildRoleResourceSchema], default: [] },
  },
  { timestamps: true, collection: "guildResourceSnapshots" },
)

type GuildResourceSnapshotDoc = mongoose.InferSchemaType<typeof guildResourceSnapshotSchema>

export const GuildResourceSnapshotModel =
  (mongoose.models.GuildResourceSnapshot as mongoose.Model<GuildResourceSnapshotDoc>) ??
  mongoose.model<GuildResourceSnapshotDoc>("GuildResourceSnapshot", guildResourceSnapshotSchema)

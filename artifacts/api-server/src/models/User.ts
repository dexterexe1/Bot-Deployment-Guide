import mongoose from "mongoose"

const userSchema = new mongoose.Schema(
  {
    discordUserId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    globalName: { type: String, required: false },
    avatar: { type: String, required: false },
  },
  { timestamps: true },
)

type UserDoc = mongoose.InferSchemaType<typeof userSchema>

export const UserModel =
  (mongoose.models.User as mongoose.Model<UserDoc>) ??
  mongoose.model<UserDoc>("User", userSchema)

import mongoose, { Schema, Document } from "mongoose"

export interface IGuildSettings extends Document {
  guildId: string
  modules?: Record<string, boolean>
  disabledCommands?: string[]
  theme?: {
    backgroundType?: string
    backgroundColor?: string
    backgroundImage?: string
    cursorType?: string
    cursorUrl?: string
    accentColor?: string
    fontFamily?: string
  }
}

const GuildSettingsSchema = new Schema<IGuildSettings>({
  guildId: { type: String, required: true, unique: true },
  modules: { type: Map, of: Boolean, default: {} },
  disabledCommands: { type: [String], default: [] },
  theme: {
    backgroundType: String,
    backgroundColor: String,
    backgroundImage: String,
    cursorType: String,
    cursorUrl: String,
    accentColor: String,
    fontFamily: String,
  },
}, { timestamps: true })

export const GuildSettingsModel = mongoose.model<IGuildSettings>("GuildSettings", GuildSettingsSchema)
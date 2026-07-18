import mongoose, { Schema, type Document } from "mongoose"

export interface ILoggingConfig extends Document {
  guildId: string
  enabled: boolean
  logChannelId: string | null
  events: {
    messageDelete?: boolean
    messageUpdate?: boolean
    messageBulkDelete?: boolean
    memberJoin?: boolean
    memberLeave?: boolean
    memberUpdate?: boolean
    moderationBan?: boolean
    moderationKick?: boolean
    moderationMute?: boolean
    moderationWarn?: boolean
    voiceJoin?: boolean
    voiceLeave?: boolean
    voiceMove?: boolean
    channelCreate?: boolean
    channelDelete?: boolean
    channelUpdate?: boolean
    roleCreate?: boolean
    roleDelete?: boolean
    roleUpdate?: boolean
    inviteCreate?: boolean
    inviteDelete?: boolean
    emojiCreate?: boolean
    emojiDelete?: boolean
    emojiUpdate?: boolean
    webhookCreate?: boolean
    webhookDelete?: boolean
    webhookUpdate?: boolean
  }
  createdAt: Date
  updatedAt: Date
}

const LoggingConfigSchema = new Schema<ILoggingConfig>({
  guildId: { type: String, required: true, index: true },
  enabled: { type: Boolean, default: false },
  logChannelId: { type: String, default: null },
  events: {
    messageDelete: { type: Boolean, default: false },
    messageUpdate: { type: Boolean, default: false },
    messageBulkDelete: { type: Boolean, default: false },
    memberJoin: { type: Boolean, default: false },
    memberLeave: { type: Boolean, default: false },
    memberUpdate: { type: Boolean, default: false },
    moderationBan: { type: Boolean, default: false },
    moderationKick: { type: Boolean, default: false },
    moderationMute: { type: Boolean, default: false },
    moderationWarn: { type: Boolean, default: false },
    voiceJoin: { type: Boolean, default: false },
    voiceLeave: { type: Boolean, default: false },
    voiceMove: { type: Boolean, default: false },
    channelCreate: { type: Boolean, default: false },
    channelDelete: { type: Boolean, default: false },
    channelUpdate: { type: Boolean, default: false },
    roleCreate: { type: Boolean, default: false },
    roleDelete: { type: Boolean, default: false },
    roleUpdate: { type: Boolean, default: false },
    inviteCreate: { type: Boolean, default: false },
    inviteDelete: { type: Boolean, default: false },
    emojiCreate: { type: Boolean, default: false },
    emojiDelete: { type: Boolean, default: false },
    emojiUpdate: { type: Boolean, default: false },
    webhookCreate: { type: Boolean, default: false },
    webhookDelete: { type: Boolean, default: false },
    webhookUpdate: { type: Boolean, default: false },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

export const LoggingConfigModel = mongoose.model<ILoggingConfig>("LoggingConfig", LoggingConfigSchema)

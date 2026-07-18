import mongoose, { Schema, type Document } from "mongoose"

export interface IWelcomeConfig extends Document {
  guildId: string
  enabled: boolean
  channelId: string | null
  message: string | null
  embed: {
    title?: string | null
    description?: string | null
    color?: string | null
    footer?: string | null
    thumbnail?: string | null
    image?: string | null
  }
  autoRoleIds: string[]
  sendDm: boolean
  dmMessage: string | null
  captchaEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

const WelcomeConfigSchema = new Schema<IWelcomeConfig>({
  guildId: { type: String, required: true, index: true },
  enabled: { type: Boolean, default: false },
  channelId: { type: String, default: null },
  message: { type: String, default: null },
  embed: {
    title: { type: String, default: null },
    description: { type: String, default: null },
    color: { type: String, default: null },
    footer: { type: String, default: null },
    thumbnail: { type: String, default: null },
    image: { type: String, default: null },
  },
  autoRoleIds: [{ type: String }],
  sendDm: { type: Boolean, default: false },
  dmMessage: { type: String, default: null },
  captchaEnabled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

export const WelcomeConfigModel = mongoose.model<IWelcomeConfig>("WelcomeConfig", WelcomeConfigSchema)

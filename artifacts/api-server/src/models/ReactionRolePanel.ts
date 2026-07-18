import mongoose, { Schema, type Document } from "mongoose"

export interface IReactionRolePanel extends Document {
  id: string
  guildId: string
  name: string
  description: string | null
  options: Array<{
    id: string
    label: string
    roleId: string
    emoji: string
    style: "primary" | "secondary" | "success" | "danger"
  }>
  embed: {
    title?: string | null
    description?: string | null
    color?: string | null
    footer?: string | null
  }
  multiSelect: boolean
  removeOnReact: boolean
  deployedMessageId: string | null
  deployedChannelId: string | null
  createdAt: Date
  updatedAt: Date
}

const ReactionRolePanelSchema = new Schema<IReactionRolePanel>({
  id: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: null },
  options: [{
    id: { type: String, required: true },
    label: { type: String, required: true },
    roleId: { type: String, required: true },
    emoji: { type: String, required: true },
    style: { type: String, enum: ["primary", "secondary", "success", "danger"], default: "primary" },
  }],
  embed: {
    title: { type: String, default: null },
    description: { type: String, default: null },
    color: { type: String, default: null },
    footer: { type: String, default: null },
  },
  multiSelect: { type: Boolean, default: false },
  removeOnReact: { type: Boolean, default: true },
  deployedMessageId: { type: String, default: null },
  deployedChannelId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

export const ReactionRolePanelModel = mongoose.model<IReactionRolePanel>("ReactionRolePanel", ReactionRolePanelSchema)

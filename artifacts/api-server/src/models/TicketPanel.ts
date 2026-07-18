import mongoose, { Schema, type Document } from "mongoose"

export interface ITicketPanel extends Document {
  id: string
  guildId: string
  name: string
  description: string | null
  categoryId: string
  supportRoleIds: string[]
  ticketLimit: number
  allowTranscripts: boolean
  transcriptChannelId: string | null
  closeMessage: string | null
  buttons: Array<{
    label: string
    style: "primary" | "secondary" | "success" | "danger"
    emoji?: string | null
  }>
  embed: {
    title?: string | null
    description?: string | null
    color?: string | null
    footer?: string | null
    thumbnail?: string | null
    image?: string | null
  }
  deployedMessageId: string | null
  deployedChannelId: string | null
  createdAt: Date
  updatedAt: Date
}

const TicketPanelSchema = new Schema<ITicketPanel>({
  id: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: null },
  categoryId: { type: String, required: true },
  supportRoleIds: [{ type: String }],
  ticketLimit: { type: Number, default: 3 },
  allowTranscripts: { type: Boolean, default: true },
  transcriptChannelId: { type: String, default: null },
  closeMessage: { type: String, default: null },
  buttons: [{
    label: { type: String, required: true },
    style: { type: String, enum: ["primary", "secondary", "success", "danger"], required: true },
    emoji: { type: String, default: null },
  }],
  embed: {
    title: { type: String, default: null },
    description: { type: String, default: null },
    color: { type: String, default: null },
    footer: { type: String, default: null },
    thumbnail: { type: String, default: null },
    image: { type: String, default: null },
  },
  deployedMessageId: { type: String, default: null },
  deployedChannelId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

export const TicketPanelModel = mongoose.model<ITicketPanel>("TicketPanel", TicketPanelSchema)

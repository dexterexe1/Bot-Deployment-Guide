import { randomUUID } from "crypto"
import { Router } from "express"
import { z } from "zod"
import { TicketPanelModel } from "../../models/TicketPanel.js"
import { requireAuth } from "../../middleware/requireAuth.js"
import { ApiError } from "../../utils/apiError.js"
import { getManageableGuild } from "../../utils/guildAccess.js"
import { created, ok } from "../../utils/respond.js"

const router = Router({ mergeParams: true })

function defaultTicketEmbed() {
  return ticketEmbedSchema.parse({})
}

function getGuildIdParam(params: unknown) {
  return String((params as { guildId?: string }).guildId ?? "")
}

const ticketButtonSchema = z.object({
  label: z.string().trim().min(1).max(80),
  style: z.enum(["primary", "secondary", "success", "danger"]),
  emoji: z.string().trim().max(32).nullable().optional(),
})

const ticketEmbedSchema = z.object({
  title: z.string().trim().max(256).nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  color: z.string().trim().max(32).nullable().optional(),
  footer: z.string().trim().max(256).nullable().optional(),
  thumbnail: z.string().trim().max(512).nullable().optional(),
  image: z.string().trim().max(512).nullable().optional(),
})

const panelPayloadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  categoryId: z.string().trim().min(1).max(64),
  supportRoleIds: z.array(z.string().trim().min(1).max(64)).max(25).default([]),
  ticketLimit: z.number().int().min(1).max(10).default(3),
  allowTranscripts: z.boolean().default(true),
  transcriptChannelId: z.string().trim().min(1).max(64).nullable().optional(),
  closeMessage: z.string().trim().max(1000).nullable().optional(),
  buttons: z.array(ticketButtonSchema).max(5).default([]),
  embed: ticketEmbedSchema.default(defaultTicketEmbed),
})

router.use(requireAuth)

router.get("/panels", async (req, res) => {
  const guild = await getManageableGuild(req, getGuildIdParam(req.params))

  const panels = await TicketPanelModel.find({ guildId: guild.id }).sort({ createdAt: -1 })
  return ok(res, { panels })
})

router.post("/panels", async (req, res) => {
  const guild = await getManageableGuild(req, getGuildIdParam(req.params))

  const payload = panelPayloadSchema.parse(req.body)
  
  const existingPanel = await TicketPanelModel.findOne({ 
    guildId: guild.id, 
    name: { $regex: new RegExp(`^${payload.name}$`, "i") } 
  })
  
  if (existingPanel) {
    throw new ApiError(409, "TICKET_PANEL_EXISTS", "A panel with this name already exists")
  }

  const panel = await TicketPanelModel.create({
    id: randomUUID(),
    guildId: guild.id,
    ...payload,
    deployedMessageId: null,
    deployedChannelId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  return created(res, { panel })
})

router.put("/panels/:panelId", async (req, res) => {
  const guild = await getManageableGuild(req, getGuildIdParam(req.params))

  const panel = await TicketPanelModel.findOne({ 
    id: req.params.panelId, 
    guildId: guild.id 
  })
  
  if (!panel) {
    throw new ApiError(404, "TICKET_PANEL_NOT_FOUND", "Panel not found")
  }

  const payload = panelPayloadSchema.partial().parse(req.body)
  
  Object.assign(panel, { ...payload, updatedAt: new Date() })
  await panel.save()

  return ok(res, { panel })
})

router.delete("/panels/:panelId", async (req, res) => {
  const guild = await getManageableGuild(req, getGuildIdParam(req.params))

  const panel = await TicketPanelModel.findOneAndDelete({ 
    id: req.params.panelId, 
    guildId: guild.id 
  })
  
  if (!panel) {
    throw new ApiError(404, "TICKET_PANEL_NOT_FOUND", "Panel not found")
  }

  return ok(res, { success: true })
})

router.post("/panels/:panelId/deploy", async (req, res) => {
  const guild = await getManageableGuild(req, getGuildIdParam(req.params))

  const panel = await TicketPanelModel.findOne({ 
    id: req.params.panelId, 
    guildId: guild.id 
  })
  
  if (!panel) {
    throw new ApiError(404, "TICKET_PANEL_NOT_FOUND", "Panel not found")
  }

  const { channelId } = z.object({ channelId: z.string().trim().min(1).max(64) }).parse(req.body)

  panel.deployedChannelId = channelId
  panel.updatedAt = new Date()
  await panel.save()

  return ok(res, { panel })
})

export default router

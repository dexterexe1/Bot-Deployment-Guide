import { randomUUID } from "crypto"
import { Router } from "express"
import { z } from "zod"
import { ReactionRolePanelModel } from "../../models/ReactionRolePanel.js"
import { requireAuth } from "../../middleware/requireAuth.js"
import { ApiError } from "../../utils/apiError.js"
import { getManageableGuild } from "../../utils/guildAccess.js"
import { created, ok } from "../../utils/respond.js"

const router = Router({ mergeParams: true })

function defaultPanelEmbed() {
  return panelEmbedSchema.parse({})
}

function getGuildIdParam(params: unknown) {
  return String((params as { guildId?: string }).guildId ?? "")
}

const roleOptionSchema = z.object({
  id: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(80),
  roleId: z.string().trim().min(1).max(64),
  emoji: z.string().trim().min(1).max(32),
  style: z.enum(["primary", "secondary", "success", "danger"]).default("primary"),
})

const panelEmbedSchema = z.object({
  title: z.string().trim().max(256).nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  color: z.string().trim().max(32).nullable().optional(),
  footer: z.string().trim().max(256).nullable().optional(),
})

const panelPayloadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  options: z.array(roleOptionSchema).max(25).default([]),
  embed: panelEmbedSchema.default(defaultPanelEmbed),
  multiSelect: z.boolean().default(false),
  removeOnReact: z.boolean().default(true),
})

router.use(requireAuth)

router.get("/panels", async (req, res) => {
  const guild = await getManageableGuild(req, getGuildIdParam(req.params))

  const panels = await ReactionRolePanelModel.find({ guildId: guild.id }).sort({ createdAt: -1 })
  return ok(res, { panels })
})

router.post("/panels", async (req, res) => {
  const guild = await getManageableGuild(req, getGuildIdParam(req.params))

  const payload = panelPayloadSchema.parse(req.body)
  
  const existingPanel = await ReactionRolePanelModel.findOne({ 
    guildId: guild.id, 
    name: { $regex: new RegExp(`^${payload.name}$`, "i") } 
  })
  
  if (existingPanel) {
    throw new ApiError(409, "REACTION_ROLE_PANEL_EXISTS", "A panel with this name already exists")
  }

  const panel = await ReactionRolePanelModel.create({
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

  const panel = await ReactionRolePanelModel.findOne({ 
    id: req.params.panelId, 
    guildId: guild.id 
  })
  
  if (!panel) {
    throw new ApiError(404, "REACTION_ROLE_PANEL_NOT_FOUND", "Panel not found")
  }

  const payload = panelPayloadSchema.partial().parse(req.body)
  
  Object.assign(panel, { ...payload, updatedAt: new Date() })
  await panel.save()

  return ok(res, { panel })
})

router.delete("/panels/:panelId", async (req, res) => {
  const guild = await getManageableGuild(req, getGuildIdParam(req.params))

  const panel = await ReactionRolePanelModel.findOneAndDelete({ 
    id: req.params.panelId, 
    guildId: guild.id 
  })
  
  if (!panel) {
    throw new ApiError(404, "REACTION_ROLE_PANEL_NOT_FOUND", "Panel not found")
  }

  return ok(res, { success: true })
})

router.post("/panels/:panelId/deploy", async (req, res) => {
  const guild = await getManageableGuild(req, getGuildIdParam(req.params))

  const panel = await ReactionRolePanelModel.findOne({ 
    id: req.params.panelId, 
    guildId: guild.id 
  })
  
  if (!panel) {
    throw new ApiError(404, "REACTION_ROLE_PANEL_NOT_FOUND", "Panel not found")
  }

  const { channelId } = z.object({ channelId: z.string().trim().min(1).max(64) }).parse(req.body)

  panel.deployedChannelId = channelId
  panel.updatedAt = new Date()
  await panel.save()

  return ok(res, { panel })
})

export default router

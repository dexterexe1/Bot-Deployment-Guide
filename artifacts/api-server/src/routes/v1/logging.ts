import { Router } from "express"
import { z } from "zod"
import { LoggingConfigModel } from "../../models/LoggingConfig.js"
import { requireAuth } from "../../middleware/requireAuth.js"
import { ApiError } from "../../utils/apiError.js"
import { getManageableGuild } from "../../utils/guildAccess.js"
import { ok } from "../../utils/respond.js"

const router = Router({ mergeParams: true })

function defaultLogEvents() {
  return logEventsSchema.parse({})
}

function getGuildIdParam(params: unknown) {
  return String((params as { guildId?: string }).guildId ?? "")
}

const logEventsSchema = z.object({
  messageDelete: z.boolean().default(false),
  messageUpdate: z.boolean().default(false),
  messageBulkDelete: z.boolean().default(false),
  memberJoin: z.boolean().default(false),
  memberLeave: z.boolean().default(false),
  memberUpdate: z.boolean().default(false),
  moderationBan: z.boolean().default(false),
  moderationKick: z.boolean().default(false),
  moderationMute: z.boolean().default(false),
  moderationWarn: z.boolean().default(false),
  voiceJoin: z.boolean().default(false),
  voiceLeave: z.boolean().default(false),
  voiceMove: z.boolean().default(false),
  channelCreate: z.boolean().default(false),
  channelDelete: z.boolean().default(false),
  channelUpdate: z.boolean().default(false),
  roleCreate: z.boolean().default(false),
  roleDelete: z.boolean().default(false),
  roleUpdate: z.boolean().default(false),
  inviteCreate: z.boolean().default(false),
  inviteDelete: z.boolean().default(false),
  emojiCreate: z.boolean().default(false),
  emojiDelete: z.boolean().default(false),
  emojiUpdate: z.boolean().default(false),
  webhookCreate: z.boolean().default(false),
  webhookDelete: z.boolean().default(false),
  webhookUpdate: z.boolean().default(false),
})

const configPayloadSchema = z.object({
  enabled: z.boolean().default(false),
  logChannelId: z.string().trim().min(1).max(64).nullable().optional(),
  events: logEventsSchema.default(defaultLogEvents),
})

router.use(requireAuth)

router.get("/config", async (req, res) => {
  const guild = await getManageableGuild(req, getGuildIdParam(req.params))

  let config = await LoggingConfigModel.findOne({ guildId: guild.id })
  
  if (!config) {
    config = await LoggingConfigModel.create({
      guildId: guild.id,
      enabled: false,
      logChannelId: null,
      events: defaultLogEvents(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  return ok(res, { config })
})

router.put("/config", async (req, res) => {
  const guild = await getManageableGuild(req, getGuildIdParam(req.params))

  const payload = configPayloadSchema.parse(req.body)

  let config = await LoggingConfigModel.findOne({ guildId: guild.id })
  
  if (!config) {
    config = await LoggingConfigModel.create({
      guildId: guild.id,
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  } else {
    Object.assign(config, { ...payload, updatedAt: new Date() })
    await config.save()
  }

  return ok(res, { config })
})

export default router

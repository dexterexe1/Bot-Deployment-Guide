import { Router } from "express"
import { z } from "zod"
import { WelcomeConfigModel } from "../../models/WelcomeConfig.js"
import { requireAuth } from "../../middleware/requireAuth.js"
import { ApiError } from "../../utils/apiError.js"
import { getManageableGuild } from "../../utils/guildAccess.js"
import { ok } from "../../utils/respond.js"

const router = Router({ mergeParams: true })

function defaultWelcomeEmbed() {
  return embedSettingsSchema.parse({})
}

function getGuildIdParam(params: unknown) {
  return String((params as { guildId?: string }).guildId ?? "")
}

const embedSettingsSchema = z.object({
  title: z.string().trim().max(256).nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  color: z.string().trim().max(32).nullable().optional(),
  footer: z.string().trim().max(256).nullable().optional(),
  thumbnail: z.string().trim().max(512).nullable().optional(),
  image: z.string().trim().max(512).nullable().optional(),
})

const configPayloadSchema = z.object({
  enabled: z.boolean().default(false),
  channelId: z.string().trim().min(1).max(64).nullable().optional(),
  message: z.string().trim().max(4000).nullable().optional(),
  embed: embedSettingsSchema.default(defaultWelcomeEmbed),
  autoRoleIds: z.array(z.string().trim().min(1).max(64)).max(25).default([]),
  sendDm: z.boolean().default(false),
  dmMessage: z.string().trim().max(4000).nullable().optional(),
  captchaEnabled: z.boolean().default(false),
})

router.use(requireAuth)

router.get("/config", async (req, res) => {
  const guild = await getManageableGuild(req, getGuildIdParam(req.params))

  let config = await WelcomeConfigModel.findOne({ guildId: guild.id })
  
  if (!config) {
    config = await WelcomeConfigModel.create({
      guildId: guild.id,
      enabled: false,
      channelId: null,
      message: null,
      embed: defaultWelcomeEmbed(),
      autoRoleIds: [],
      sendDm: false,
      dmMessage: null,
      captchaEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  return ok(res, { config })
})

router.put("/config", async (req, res) => {
  const guild = await getManageableGuild(req, getGuildIdParam(req.params))

  const payload = configPayloadSchema.parse(req.body)

  let config = await WelcomeConfigModel.findOne({ guildId: guild.id })
  
  if (!config) {
    config = await WelcomeConfigModel.create({
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

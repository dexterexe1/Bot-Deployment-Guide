import { Router } from "express"
import { z } from "zod"
import BotConfig from "../../models/BotConfig.js"
import { requireAuth } from "../../middleware/requireAuth.js"
import { getManageableGuild } from "../../utils/guildAccess.js"
import { ok } from "../../utils/respond.js"

const router = Router({ mergeParams: true })

const botConfigSchema = z.object({
  modules: z.object({
    moderation: z.boolean(),
    tickets: z.boolean(),
    applications: z.boolean(),
    logging: z.boolean(),
    welcome: z.boolean(),
    reactionRoles: z.boolean(),
    leveling: z.boolean(),
    music: z.boolean(),
    autoResponses: z.boolean(),
    customCommands: z.boolean(),
  }),
  moduleSettings: z.record(z.string(), z.unknown()).optional(),
})

function createDefaultModules() {
  return {
    moderation: false,
    tickets: false,
    applications: false,
    logging: false,
    welcome: false,
    reactionRoles: false,
    leveling: false,
    music: false,
    autoResponses: false,
    customCommands: false,
  }
}

function getGuildIdParam(params: unknown) {
  return String((params as { guildId?: string }).guildId ?? "")
}

router.use(requireAuth)

router.get("/", async (req, res, next) => {
  try {
    const guildId = getGuildIdParam(req.params)
    await getManageableGuild(req, guildId)

    let config = await BotConfig.findOne({ guildId })

    if (!config) {
      config = await BotConfig.create({
        guildId,
        modules: createDefaultModules(),
      })
    }

    ok(res, { config })
  } catch (err) {
    next(err)
  }
})

router.put("/", async (req, res, next) => {
  try {
    const guildId = getGuildIdParam(req.params)
    await getManageableGuild(req, guildId)

    const payload = botConfigSchema.parse(req.body)
    const config = await BotConfig.findOneAndUpdate(
      { guildId },
      { ...payload, updatedAt: new Date() },
      { upsert: true, new: true },
    )

    ok(res, { config, message: "Configuration updated successfully" })
  } catch (err) {
    next(err)
  }
})

export default router

import { Router } from "express"
import { z } from "zod"
import { requireBotSecret } from "../middleware/requireBotSecret.js"
import { BotStatusModel } from "../models/BotStatus.js"
import { GuildResourceSnapshotModel } from "../models/GuildResourceSnapshot.js"
import { ok } from "../utils/respond.js"

const router = Router()

const botStatusSchema = z.object({
  online: z.boolean(),
  guildCount: z.number().int().nonnegative(),
  memberCount: z.number().int().nonnegative(),
  ping: z.number().int().nonnegative(),
  guilds: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      icon: z.string().nullable().optional(),
      memberCount: z.number().int().nonnegative(),
    }),
  ),
})

const guildResourceSnapshotSchema = z.object({
  guildId: z.string().min(1),
  fetchedAt: z.string().datetime().optional(),
  channels: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      type: z.enum(["text", "voice", "forum", "announcement", "stage", "unknown"]),
      parentId: z.string().nullable().optional(),
      parentName: z.string().nullable().optional(),
      position: z.number().int(),
    }),
  ),
  categories: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      position: z.number().int(),
    }),
  ),
  roles: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      color: z.number().int().nullable().optional(),
      managed: z.boolean(),
      position: z.number().int(),
    }),
  ),
})

router.post("/status", requireBotSecret, async (req, res, next) => {
  try {
    const payload = botStatusSchema.parse(req.body)
    await BotStatusModel.updateOne(
      { _id: "current" },
      {
        $set: {
          ...payload,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    )
    ok(res, { saved: true })
  } catch (err) {
    next(err)
  }
})

router.get("/status", async (_req, res) => {
  const doc = await BotStatusModel.findById("current").lean()
  ok(res, {
    online: doc?.online ?? null,
    ping: doc?.ping ?? null,
    updatedAt: doc?.updatedAt?.toISOString() ?? null,
  })
})

router.get("/guilds", async (_req, res) => {
  const doc = await BotStatusModel.findById("current").lean()
  ok(res, { guilds: doc?.guilds ?? [] })
})

router.post("/guild-resources", requireBotSecret, async (req, res, next) => {
  try {
    const payload = guildResourceSnapshotSchema.parse(req.body)
    await GuildResourceSnapshotModel.updateOne(
      { guildId: payload.guildId },
      {
        $set: {
          guildId: payload.guildId,
          fetchedAt: payload.fetchedAt ? new Date(payload.fetchedAt) : new Date(),
          channels: payload.channels,
          categories: payload.categories,
          roles: payload.roles,
        },
      },
      { upsert: true },
    )
    ok(res, { saved: true })
  } catch (err) {
    next(err)
  }
})

export default router

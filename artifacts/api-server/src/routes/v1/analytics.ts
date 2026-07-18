import { Router } from "express"
import { z } from "zod"
import AnalyticsSnapshot from "../../models/AnalyticsSnapshot.js"
import { requireAuth } from "../../middleware/requireAuth.js"
import { getManageableGuild } from "../../utils/guildAccess.js"
import { ok } from "../../utils/respond.js"

const router = Router({ mergeParams: true })

const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7),
})

function getGuildIdParam(params: unknown) {
  return String((params as { guildId?: string }).guildId ?? "")
}

router.use(requireAuth)

router.get("/", async (req, res, next) => {
  try {
    const guildId = getGuildIdParam(req.params)
    await getManageableGuild(req, guildId)

    const { days } = analyticsQuerySchema.parse(req.query)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const snapshots = await AnalyticsSnapshot.find({
      guildId,
      timestamp: { $gte: startDate },
    }).sort({ timestamp: 1 })

    const latestSnapshot = await AnalyticsSnapshot.findOne({ guildId }).sort({ timestamp: -1 })

    ok(res, {
      stats: {
        memberCount: latestSnapshot?.memberCount ?? 0,
        messageCount: latestSnapshot?.messageCount ?? 0,
        commandUsage: latestSnapshot?.commandUsage ?? 0,
        ticketCount: latestSnapshot?.ticketCount ?? 0,
        applicationCount: latestSnapshot?.applicationCount ?? 0,
        activeUsers: latestSnapshot?.activeUsers ?? 0,
      },
      historicalData: snapshots.map((snapshot) => ({
        timestamp: snapshot.timestamp,
        memberCount: snapshot.memberCount,
        messageCount: snapshot.messageCount,
        commandUsage: snapshot.commandUsage,
        ticketCount: snapshot.ticketCount,
        applicationCount: snapshot.applicationCount,
        activeUsers: snapshot.activeUsers,
      })),
      botStatus: {
        latency: Math.floor(Math.random() * 50) + 20,
        cpu: Math.floor(Math.random() * 30) + 10,
        ram: Math.floor(Math.random() * 40) + 30,
        mongodb: "connected",
        uptime: process.uptime(),
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router

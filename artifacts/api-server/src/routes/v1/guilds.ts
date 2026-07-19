// ADD THIS IMPORT AT THE TOP
import { authMiddleware } from '../../middleware/auth' // Adjust path if needed
import { db } from '../../db' // Make sure db is imported too
import { Router } from "express"
import { requireAuth } from "../../middleware/requireAuth.js"
import { ok } from "../../utils/respond.js"
import { fetchDiscordGuilds, guildIconUrl } from "../../providers/discord.js"
import { BotStatusModel } from "../../models/BotStatus.js"
import { GuildResourceSnapshotModel } from "../../models/GuildResourceSnapshot.js"
import { env } from "../../config/env.js"
import { canManageGuild, getManageableGuild } from "../../utils/guildAccess.js"
import { serializeGuildResourceSnapshot } from "../../utils/applicationSerializers.js"

const router = Router()

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const guilds = await fetchDiscordGuilds(req.session.discordAccessToken!)
    const manageable = guilds.filter((g) => canManageGuild(g.permissions))
    ok(res, {
      guilds: manageable.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon ?? null,
        permissions: g.permissions,
      })),
    })
  } catch (err) {
    next(err)
  }
})

router.get("/:guildId/overview", requireAuth, async (req, res, next) => {
  try {
    const guildId = req.params.guildId
    const selected = await getManageableGuild(req, guildId)

    const [botStatus, resourceSnapshot] = await Promise.all([
      BotStatusModel.findById("current").lean(),
      GuildResourceSnapshotModel.findOne({ guildId }).lean(),
    ])
    const botGuild = botStatus?.guilds?.find((g) => g.id === guildId)

    ok(res, {
      guild: {
        id: selected.id,
        name: selected.name,
        iconUrl: guildIconUrl(selected.id, selected.icon),
        ownerId: null,
      },
      stats: {
        memberCount: botGuild?.memberCount ?? null,
        channelCount: resourceSnapshot?.channels?.length ?? null,
        roleCount: resourceSnapshot?.roles?.length ?? null,
      },
      bot: {
        status: botStatus ? (botStatus.online ? "online" : "offline") : null,
        latencyMs: botStatus?.ping ?? null,
        joinedAt: null,
      },
      meta: {
        dashboardVersion: env.DASHBOARD_VERSION,
      },
      recentActivity: [],
    })
  } catch (err) {
    next(err)
  }
})

router.get("/:guildId/resources", requireAuth, async (req, res, next) => {
  try {
    const guildId = req.params.guildId
    await getManageableGuild(req, guildId)

    const snapshot = await GuildResourceSnapshotModel.findOne({ guildId }).lean()
    ok(
      res,
      serializeGuildResourceSnapshot({
        guildId,
        fetchedAt: snapshot?.fetchedAt ?? null,
        channels: snapshot?.channels ?? [],
        categories: snapshot?.categories ?? [],
        roles: snapshot?.roles ?? [],
      }),
    )
  } catch (err) {
    next(err)
  }
})
// ================= NEW: Dashboard Toggle Routes =================

// SAVE MODULE TOGGLES (e.g., { "custom-commands": true, "logging": false })
router.patch("/:guildId/modules", requireAuth, async (req, res, next) => {
  try {
    const { guildId } = req.params
    const { modules } = req.body
    
    await GuildSettingsModel.findOneAndUpdate(
      { guildId },
      { $set: { modules } },
      { upsert: true, new: true }
    )
    
    ok(res, { success: true })
  } catch (err) {
    next(err)
  }
})

// SAVE DISABLED COMMANDS (e.g., { "disabledCommands": ["ban", "kick"] })
router.patch("/:guildId/commands", requireAuth, async (req, res, next) => {
  try {
    const { guildId } = req.params
    const { disabledCommands } = req.body
    
    await GuildSettingsModel.findOneAndUpdate(
      { guildId },
      { $set: { disabledCommands } },
      { upsert: true, new: true }
    )
    
    ok(res, { success: true })
  } catch (err) {
    next(err)
  }
})

// SAVE THEME/CUSTOMIZATION
router.patch("/:guildId/theme", requireAuth, async (req, res, next) => {
  try {
    const { guildId } = req.params
    const { theme } = req.body
    
    await GuildSettingsModel.findOneAndUpdate(
      { guildId },
      { $set: { theme } },
      { upsert: true, new: true }
    )
    
    ok(res, { success: true })
  } catch (err) {
    next(err)
  }
})

// ================= END NEW ROUTES =================
export default router

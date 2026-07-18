import { Router } from "express"
import { z } from "zod"
import { SiteSettingsModel, DEFAULT_SITE_SETTINGS } from "../../models/SiteSettings.js"
import { requireAuth } from "../../middleware/requireAuth.js"
import { ok } from "../../utils/respond.js"
import { ApiError } from "../../utils/apiError.js"
import { env } from "../../config/env.js"

const router = Router()

const cursorPatchSchema = z.object({
  cursor: z
    .object({
      enabled: z.boolean().optional(),
      type: z.enum(["bunny", "bunny-glow", "bunny-large", "default"]).optional(),
      color: z.string().min(1).max(120).optional(),
    })
    .optional(),
})

/** GET /api/v1/site-settings — public, no auth. Used by the frontend to fetch
 *  the active cursor (and future site-wide settings) for every visitor. */
router.get("/", async (_req, res) => {
  if (!env.MONGO_URI) {
    return ok(res, { settings: DEFAULT_SITE_SETTINGS })
  }

  let settings = await SiteSettingsModel.findById("global").lean()
  if (!settings) {
    // Auto-create the singleton on first call
    const created = await SiteSettingsModel.create({ _id: "global", ...DEFAULT_SITE_SETTINGS })
    settings = created.toObject()
  }

  return ok(res, { settings })
})

/** PATCH /api/v1/site-settings — dev-portal only, requires login.
 *  Merges partial updates; fields not sent are left unchanged. */
router.patch("/", requireAuth, async (req, res) => {
  if (!env.MONGO_URI) {
    throw new ApiError(503, "NO_DATABASE", "MongoDB is not configured")
  }

  const body = cursorPatchSchema.parse(req.body)

  // Build dot-notation update so we don't stomp unrelated fields
  const $set: Record<string, unknown> = {}
  if (body.cursor) {
    for (const [k, v] of Object.entries(body.cursor)) {
      if (v !== undefined) $set[`cursor.${k}`] = v
    }
  }

  const settings = await SiteSettingsModel.findByIdAndUpdate(
    "global",
    { $set },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean()

  return ok(res, { settings })
})

export default router

import type { RequestHandler } from "express"
import { ApiError } from "../utils/apiError.js"
import { env } from "../config/env.js"

/**
 * Middleware that gates a route to users whose Discord ID appears in the
 * DEVELOPER_IDS environment variable. Must be used after requireAuth so
 * req.session.user is guaranteed to be set.
 */
export const requireDeveloper: RequestHandler = (req, _res, next) => {
  const developerIds = (env.DEVELOPER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0)

  const isDeveloper =
    !!req.session.user?.discordUserId &&
    developerIds.length > 0 &&
    developerIds.includes(req.session.user.discordUserId)

  if (!isDeveloper) {
    return next(new ApiError(403, "FORBIDDEN", "Developer access required"))
  }

  next()
}

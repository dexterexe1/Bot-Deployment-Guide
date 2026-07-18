import type { RequestHandler } from "express"
import { env } from "../config/env.js"
import { ApiError } from "../utils/apiError.js"

export const requireBotSecret: RequestHandler = (req, _res, next) => {
  if (!env.BOT_API_SECRET) {
    return next(new ApiError(503, "BOT_SECRET_NOT_CONFIGURED", "Bot integration is not configured"))
  }

  const provided = req.header("x-bot-secret")
  if (!provided || provided !== env.BOT_API_SECRET) {
    return next(new ApiError(401, "BOT_SECRET_INVALID", "Unauthorized"))
  }

  next()
}


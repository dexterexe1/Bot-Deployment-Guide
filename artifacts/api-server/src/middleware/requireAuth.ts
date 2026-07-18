import type { RequestHandler } from "express"
import { ApiError } from "../utils/apiError.js"
import { refreshDiscordToken } from "../providers/discord.js"

export const requireAuth: RequestHandler = async (req, _res, next) => {
  if (!req.session.user || !req.session.discordAccessToken) {
    return next(new ApiError(401, "UNAUTHENTICATED", "Authentication required"))
  }
  if (req.session.discordTokenExpiresAt && Date.now() > req.session.discordTokenExpiresAt - 60_000) {
    if (!req.session.discordRefreshToken) {
      return next(new ApiError(401, "UNAUTHENTICATED", "Authentication required"))
    }
    try {
      const token = await refreshDiscordToken(req.session.discordRefreshToken)
      req.session.discordAccessToken = token.access_token
      if (token.refresh_token) req.session.discordRefreshToken = token.refresh_token
      req.session.discordTokenExpiresAt = Date.now() + token.expires_in * 1000
    } catch (err) {
      return next(err)
    }
  }
  next()
}

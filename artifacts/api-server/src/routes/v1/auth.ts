import { Router } from "express"
import { randomUUID } from "crypto"
import { env } from "../../config/env.js"
import { ApiError } from "../../utils/apiError.js"
import { ok } from "../../utils/respond.js"
import { exchangeCodeForToken, fetchDiscordUser, buildDiscordAuthorizeUrl } from "../../providers/discord.js"
import { UserModel } from "../../models/User.js"
import { requireAuth } from "../../middleware/requireAuth.js"

const router = Router()

router.get("/discord/login", (req, res, next) => {
  const base = new URL(buildDiscordAuthorizeUrl())
  const state = randomUUID()

  req.session.oauthState = state

  console.log("LOGIN")
  console.log("Session ID:", req.session.id)
  console.log("State:", req.session.oauthState)
  console.log("Before save:", req.session)

  base.searchParams.set("state", state)

  req.session.save((err) => {
    if (err) return next(err)

    console.log("After save:", req.session)

    res.redirect(base.toString())
  })
})

router.get("/discord/callback", async (req, res, next) => {
  try {
    const code = typeof req.query.code === "string" ? req.query.code : null
    const state = typeof req.query.state === "string" ? req.query.state : null

    if (!code) throw new ApiError(400, "MISSING_CODE", "Missing code")
    if (!state || !req.session.oauthState || state !== req.session.oauthState) {
      console.log("=== CALLBACK ===");
      console.log("Session ID:", req.session.id);
      console.log("Discord state:", state);
      console.log("Session state:", req.session.oauthState);
      throw new ApiError(400, "OAUTH_STATE_MISMATCH", "Invalid state")
    }

    req.session.oauthState = undefined
    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()))
    })

    const token = await exchangeCodeForToken(code)
    const user = await fetchDiscordUser(token.access_token)

    const sessionUser = {
      discordUserId: user.id,
      username: user.username,
      globalName: user.global_name ?? null,
      avatar: user.avatar ?? null,
    }

    req.session.user = sessionUser
    req.session.discordAccessToken = token.access_token
    req.session.discordRefreshToken = token.refresh_token
    req.session.discordTokenExpiresAt = Date.now() + token.expires_in * 1000

    await UserModel.updateOne(
      { discordUserId: sessionUser.discordUserId },
      {
        $set: {
          discordUserId: sessionUser.discordUserId,
          username: sessionUser.username,
          globalName: sessionUser.globalName,
          avatar: sessionUser.avatar,
        },
      },
      { upsert: true },
    )

    res.redirect(new URL("/app", env.DASHBOARD_APP_URL).toString())
  } catch (err) {
    next(err)
  }
})

router.get("/me", requireAuth, (req, res) => {
  ok(res, { user: req.session.user })
})

router.post("/logout", async (req, res, next) => {
  try {
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => (err ? reject(err) : resolve()))
    })
    res.clearCookie(env.SESSION_COOKIE_NAME)
    ok(res, { ok: true })
  } catch (err) {
    next(err)
  }
})

router.get("/discord/config", (_req, res) => {
  ok(res, { clientId: env.DISCORD_CLIENT_ID })
})

export default router


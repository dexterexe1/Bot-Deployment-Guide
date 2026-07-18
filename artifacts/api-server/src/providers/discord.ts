import { env } from "../config/env.js"
import { ApiError } from "../utils/apiError.js"

type TokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

type DiscordUser = {
  id: string
  username: string
  global_name?: string | null
  avatar?: string | null
}

type DiscordGuild = {
  id: string
  name: string
  icon?: string | null
  owner?: boolean
  permissions: string
}

export function buildDiscordAuthorizeUrl() {
  const url = new URL("https://discord.com/api/oauth2/authorize")
  url.searchParams.set("client_id", env.DISCORD_CLIENT_ID)
  url.searchParams.set("redirect_uri", env.DISCORD_REDIRECT_URI)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", env.DISCORD_SCOPES)
  return url.toString()
}

export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams()
  body.set("client_id", env.DISCORD_CLIENT_ID)
  body.set("client_secret", env.DISCORD_CLIENT_SECRET)
  body.set("grant_type", "authorization_code")
  body.set("code", code)
  body.set("redirect_uri", env.DISCORD_REDIRECT_URI)

  const resp = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  })

  if (!resp.ok) {
    const body = await resp.text()
    console.error(`[discord] token exchange failed (${resp.status}): ${body}`)
    console.error(`[discord] redirect_uri used: ${env.DISCORD_REDIRECT_URI}`)
    throw new ApiError(401, "DISCORD_TOKEN_EXCHANGE_FAILED", "Discord authentication failed")
  }

  return (await resp.json()) as TokenResponse
}

export async function refreshDiscordToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams()
  body.set("client_id", env.DISCORD_CLIENT_ID)
  body.set("client_secret", env.DISCORD_CLIENT_SECRET)
  body.set("grant_type", "refresh_token")
  body.set("refresh_token", refreshToken)

  const resp = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  })

  if (!resp.ok) {
    throw new ApiError(401, "DISCORD_TOKEN_REFRESH_FAILED", "Discord session expired")
  }

  return (await resp.json()) as TokenResponse
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const resp = await fetch("https://discord.com/api/users/@me", {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  })

  if (!resp.ok) {
    const text = await resp.text()

    console.error("========== DISCORD USER ERROR ==========")
    console.error("Status:", resp.status)
    console.error("Response:", text)
    console.error("========================================")

    throw new ApiError(
      401,
      "DISCORD_USER_FETCH_FAILED",
      "Discord authentication failed",
    )
  }

  return (await resp.json()) as DiscordUser
}

export async function fetchDiscordGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const resp = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  })

  if (!resp.ok) {
    const text = await resp.text()

    console.error("========== DISCORD GUILDS ERROR ==========")
    console.error("Status:", resp.status)
    console.error("Response:", text)
    console.error("==========================================")

    throw new ApiError(
      401,
      "DISCORD_GUILDS_FETCH_FAILED",
      "Discord authentication failed",
    )
  }

  return (await resp.json()) as DiscordGuild[]
}

export function guildIconUrl(guildId: string, iconHash?: string | null) {
  if (!iconHash) return null
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png?size=128`
}

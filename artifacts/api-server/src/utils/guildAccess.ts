import type { Request } from "express"
import { fetchDiscordGuilds } from "../providers/discord.js"
import { ApiError } from "./apiError.js"

export const MANAGE_GUILD = 0x20n

export function canManageGuild(permissions: string) {
  try {
    const parsed = BigInt(permissions)
    return (parsed & MANAGE_GUILD) === MANAGE_GUILD
  } catch {
    return false
  }
}

export async function getManageableGuild(req: Request, guildId: string) {
  if (!req.session.discordAccessToken) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication required")
  }

  const guilds = await fetchDiscordGuilds(req.session.discordAccessToken)
  const selectedGuild = guilds.find((guild) => guild.id === guildId)

  if (!selectedGuild) {
    throw new ApiError(404, "GUILD_NOT_FOUND", "Guild not found")
  }

  if (!canManageGuild(selectedGuild.permissions)) {
    throw new ApiError(403, "GUILD_FORBIDDEN", "Insufficient permissions")
  }

  return selectedGuild
}

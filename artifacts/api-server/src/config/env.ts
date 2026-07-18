import "dotenv/config"
import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),

  WEB_ORIGIN: z.string().default("http://localhost:5173"),

  MONGO_URI: z.string().min(1).optional(),
  MONGO_DB: z.string().min(1).default("bunnies"),

  SESSION_SECRET: z.string().min(16).default("dev-secret-minimum-32-chars-here!!"),
  SESSION_COOKIE_NAME: z.string().min(1).default("ubdash.sid"),
  SESSION_TTL_MS: z.coerce.number().int().positive().default(1000 * 60 * 60 * 24 * 7),

  DISCORD_CLIENT_ID: z.string().min(1).optional(),
  DISCORD_CLIENT_SECRET: z.string().min(1).optional(),
  DISCORD_REDIRECT_URI: z.string().optional(),
  DISCORD_SCOPES: z.string().min(1).default("identify guilds"),

  DASHBOARD_APP_URL: z.string().default("http://localhost:5173"),
  DASHBOARD_VERSION: z.string().min(1).default("0.1.0"),

  BOT_API_SECRET: z.string().min(1).optional(),
})

const result = envSchema.safeParse(process.env)
if (!result.success) {
  console.error("❌ Invalid environment variables:", result.error.format())
  process.exit(1)
}

export const env = result.data

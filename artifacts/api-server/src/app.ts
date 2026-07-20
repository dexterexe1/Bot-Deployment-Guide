import express, { type Request } from "express"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import session from "express-session"
import MongoStore from "connect-mongo"
import { env } from "./config/env.js"
import { connectMongo } from "./config/mongo.js"
import { requestContextMiddleware } from "./middleware/requestContext.js"
import { errorHandlerMiddleware } from "./middleware/errorHandler.js"
import { notFoundMiddleware } from "./middleware/notFound.js"
import botRoutes from "./routes/bot.js"
import authRoutes from "./routes/v1/auth.js"
import metaRoutes from "./routes/v1/meta.js"
import guildRoutes from "./routes/v1/guilds.js"
import applicationRoutes from "./routes/v1/applications.js"
import ticketRoutes from "./routes/v1/tickets.js"
import reactionRoleRoutes from "./routes/v1/reactionRoles.js"
import loggingRoutes from "./routes/v1/logging.js"
import welcomeRoutes from "./routes/v1/welcome.js"
import analyticsRoutes from "./routes/v1/analytics.js"
import botConfigRoutes from "./routes/v1/bot.js"
import templateRoutes from "./routes/v1/templates.js"
import siteSettingsRoutes from "./routes/v1/siteSettings.js"

// Connect to MongoDB only if MONGO_URI is configured
if (env.MONGO_URI) {
  await connectMongo()
  console.log("✅ MongoDB connected")
} else {
  console.warn("⚠️  MONGO_URI not set — running without database. Auth endpoints will not work until you configure it.")
}

const app = express()

// Trust Render's reverse proxy so secure cookies and req.protocol work correctly
app.set("trust proxy", 1)
app.disable("x-powered-by")

app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
)

app.use(helmet({ contentSecurityPolicy: false }))
app.use(express.json({ limit: "1mb" }))

app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 240,
    standardHeaders: true,
    legacyHeaders: false,
  }),
)

app.use(requestContextMiddleware)

// Build session store — use MongoStore when MONGO_URI is available
const sessionStore = env.MONGO_URI
  ? MongoStore.create({
      mongoUrl: env.MONGO_URI,
      dbName: env.MONGO_DB,
      collectionName: "sessions",
      stringify: false,
      ttl: Math.floor(env.SESSION_TTL_MS / 1000),
    })
  : undefined

app.use(
  session({
    name: env.SESSION_COOKIE_NAME,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: true, // <-- ADD THIS: Tells express-session to trust Render's reverse proxy
    cookie: {
      httpOnly: true,
      secure: true, // ALWAYS true for production HTTPS on Render
      sameSite: "none", // <-- FORCE THIS: Required for cross-origin OAuth cookies
      maxAge: env.SESSION_TTL_MS,
    },
    ...(sessionStore ? { store: sessionStore } : {}),
  }),
)
// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true, mongo: !!env.MONGO_URI })
})

// Routes
app.use("/api/bot", botRoutes)
app.use("/api/v1/auth", authRoutes)
app.use("/api/v1/meta", metaRoutes)
app.use("/api/v1/guilds", guildRoutes)
app.use("/api/v1/guilds/:guildId/applications", applicationRoutes)
app.use("/api/v1/guilds/:guildId/tickets", ticketRoutes)
app.use("/api/v1/guilds/:guildId/reaction-roles", reactionRoleRoutes)
app.use("/api/v1/guilds/:guildId/logging", loggingRoutes)
app.use("/api/v1/guilds/:guildId/welcome", welcomeRoutes)
app.use("/api/v1/guilds/:guildId/analytics", analyticsRoutes)
app.use("/api/v1/guilds/:guildId/bot", botConfigRoutes)
app.use("/api/v1/templates", templateRoutes)
app.use("/api/v1/site-settings", siteSettingsRoutes)

app.get("/api", (_req, res) => {
  res.status(200).json({ ok: true })
})

app.use((_req: Request, _res, next) => notFoundMiddleware(next))
app.use(errorHandlerMiddleware)

export default app

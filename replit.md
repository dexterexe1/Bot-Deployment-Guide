# United Bunnies Dashboard

A full-stack Discord server management dashboard with a feature-rich Python Discord bot and a live developer portal for controlling site-wide settings (including custom cursor).

## Architecture

Three deployable services:

| Service | Directory | Purpose |
|---------|-----------|---------|
| **Discord Bot** | `bot.py`, `mongo_bridge.py` | Python bot (discord.py). Syncs to MongoDB every 20 s. |
| **API Server** | `artifacts/api-server/` | Express + TypeScript REST API. Discord OAuth2, MongoDB/Mongoose, sessions. |
| **Dashboard** | `artifacts/dashboard/` | React SPA (TanStack Router v1 + Framer Motion + shadcn/ui + Tailwind v4). |

## Repo layout

```
/
├── bot.py              # Main Discord bot (discord.py, prefix ?)
├── mongo_bridge.py     # SQLite → MongoDB sync
├── requirements.txt    # Python deps
├── artifacts/
│   ├── api-server/     # Express API (TypeScript, esbuild)
│   └── dashboard/      # React frontend (Vite + TanStack Router)
└── replit.md           # This file
```

## Development (Replit)

All three workflows run inside Replit:
- **API Server**: `pnpm --filter @workspace/api-server run dev`  (port 8080, proxied at `/api`)
- **Dashboard**: `pnpm --filter @workspace/dashboard run dev`   (port 23183, proxied at `/`)
- **Bot**: Python — requires `BOT_TOKEN`, `MONGO_URI`, etc.

The Vite dev server proxies `/api/*` → API Server so the frontend doesn't need CORS config in dev.

## Required environment variables

Set these in Replit Secrets (and on Render as Environment Variables):

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | ✅ | Min 32-char random string |
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `MONGO_DB` | optional | Database name (default: `bunnydb`) |
| `DISCORD_CLIENT_ID` | ✅ | Your Discord application client ID |
| `DISCORD_CLIENT_SECRET` | ✅ | Your Discord application client secret |
| `DISCORD_REDIRECT_URI` | ✅ | OAuth2 callback URL (`https://your-api.onrender.com/api/v1/auth/discord/callback`) |
| `DASHBOARD_APP_URL` | ✅ | Dashboard public URL (for OAuth redirect after login) |
| `WEB_ORIGIN` | ✅ | Dashboard origin for CORS (same as DASHBOARD_APP_URL) |
| `BOT_TOKEN` | ✅ (bot only) | Your Discord bot token |
| `GIPHY_API_KEY` | optional | For GIF commands |
| `BOT_API_SECRET` | optional | Shared secret between bot and API server |

## Deploying to Render

### 1. Bot (`bot.py`)
- **Type**: Background Worker
- **Runtime**: Python 3
- **Build command**: `pip install -r requirements.txt`
- **Start command**: `python bot.py`
- **Env vars**: `BOT_TOKEN`, `MONGO_URI`, `MONGO_DB`, `BOT_API_SECRET`, `BOT_STATUS_URL`, `GIPHY_API_KEY`

### 2. API Server (`artifacts/api-server/`)
- **Type**: Web Service
- **Runtime**: Node 20+
- **Root directory**: leave blank (repo root)
- **Build command**: `npm install -g pnpm && pnpm install && pnpm --filter @workspace/api-server run build`
- **Start command**: `node --enable-source-maps artifacts/api-server/dist/index.mjs`
- **Port**: `10000` (set `PORT=10000`)
- **Env vars**: `SESSION_SECRET`, `MONGO_URI`, `MONGO_DB`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `DASHBOARD_APP_URL`, `WEB_ORIGIN`, `BOT_API_SECRET`

### 3. Dashboard (`artifacts/dashboard/`)
- **Type**: Static Site
- **Root directory**: leave blank (repo root)
- **Build command**: `npm install -g pnpm && pnpm install && pnpm --filter @workspace/dashboard run build`
- **Publish directory**: `artifacts/dashboard/dist/public`
- **Rewrite rule**: `/* → /index.html` (SPA routing)
- **Add a Render rewrite rule**: `Source: /api/*` → `Destination: https://your-api.onrender.com/api/*` (proxy to API)
- **Or**: set `VITE_API_URL=https://your-api.onrender.com` and update `src/lib/api.ts` to use it

### Discord OAuth2 setup
1. Go to https://discord.com/developers/applications
2. Select your application → OAuth2
3. Add Redirect URI: `https://your-api.onrender.com/api/v1/auth/discord/callback`
4. Set `DISCORD_REDIRECT_URI` to that exact URL on the API server

## Key features

### Custom Cursor (bunny theme)
- Cursor settings stored in MongoDB `SiteSettings` collection
- `GET /api/v1/site-settings` — public, fetched by every visitor's browser
- `PATCH /api/v1/site-settings` — requires login, used by the Developer Portal
- Developer Portal (`/developer-portal`) has live controls: toggle on/off, 4 cursor styles, 8 color presets + custom RGBA
- Changes apply to all visitors within ~60 seconds (React Query staleTime)

### Bot → Dashboard connection
- Bot pushes status every 20s: `POST /api/bot/status` (with `x-bot-secret` header)
- Bot pushes guild resources: `POST /api/bot/guild-resources`
- Dashboard reads bot status from MongoDB (via API GET routes)

## User preferences

- Keep the dark Discord-style theme (deep navy + violet accent).
- API uses ESM (`"type": "module"`) — always use `.js` extensions in imports.
- MongoDB/Mongoose for persistence; no PostgreSQL/Drizzle.
- TanStack Router v1 (file-based) for dashboard routing.
- Do NOT use `@workspace/api-client-react` in the dashboard — it has its own `src/lib/api.ts`.

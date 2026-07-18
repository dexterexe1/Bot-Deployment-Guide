# United Bunnies Dashboard

A full-stack Discord server management dashboard with a feature-rich Python Discord bot.

## Architecture

Three deployable services:

| Service | Directory | Purpose |
|---------|-----------|---------|
| **Discord Bot** | `bot.py`, `mongo_bridge.py` | Python bot (discord.py). Runs locally, syncs to MongoDB every 20 s. |
| **API Server** | `artifacts/api-server/` | Express + TypeScript REST API. Discord OAuth2, MongoDB/Mongoose, sessions. |
| **Dashboard** | `artifacts/dashboard/` | React SPA (TanStack Router + Framer Motion + shadcn/ui + Tailwind v4). |

## Repo layout

```
/
├── bot.py              # Main Discord bot
├── mongo_bridge.py     # SQLite → MongoDB sync
├── requirements.txt    # Python deps
├── artifacts/
│   ├── api-server/     # Express API (TypeScript, esbuild)
│   └── dashboard/      # React frontend (Vite + TanStack Router)
└── replit.md           # This file
```

## Development (Replit)

All three workflows run automatically inside Replit:
- **API Server**: `pnpm --filter @workspace/api-server run dev`
- **Dashboard**: `pnpm --filter @workspace/dashboard run dev`
- **Bot**: Python — requires `BOT_TOKEN`, `MONGO_URI`, etc.

The Vite dev server proxies `/api/*` → API Server so the frontend doesn't need CORS configuration in dev.

## Required environment variables

Set these in Replit Secrets (and on Render as Environment Variables):

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | ✅ | Min 32-char random string |
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `MONGO_DB` | optional | Database name (default: `bunnydb`) |
| `DISCORD_CLIENT_ID` | ✅ | Your Discord application client ID |
| `DISCORD_CLIENT_SECRET` | ✅ | Your Discord application client secret |
| `DISCORD_REDIRECT_URI` | ✅ | OAuth2 callback URL (e.g. `https://your-api.onrender.com/api/v1/auth/discord/callback`) |
| `BOT_TOKEN` | ✅ (bot only) | Your Discord bot token |
| `GIPHY_API_KEY` | optional | For GIF commands |
| `BOT_API_SECRET` | optional | Shared secret between bot and API server |
| `BOT_STATUS_URL` | optional | Bot health check endpoint |

## Deploying to Render

### 1. Bot (`bot.py`)
- **Type**: Background Worker
- **Runtime**: Python
- **Build command**: `pip install -r requirements.txt`
- **Start command**: `python bot.py`
- **Env vars**: `BOT_TOKEN`, `MONGO_URI`, `MONGO_DB`, and any optional vars above

### 2. API Server (`artifacts/api-server/`)
- **Type**: Web Service
- **Runtime**: Node (20+)
- **Root directory**: `artifacts/api-server`
- **Build command**: `npm install -g pnpm && pnpm install && pnpm run build`
- **Start command**: `pnpm run start`
- **Port**: `10000` (Render default — set `PORT=10000` or let Render inject it)
- **Env vars**: all of the above except `BOT_TOKEN`

### 3. Dashboard (`artifacts/dashboard/`)
- **Type**: Static Site
- **Root directory**: `artifacts/dashboard`
- **Build command**: `npm install -g pnpm && pnpm install && pnpm run build`
- **Publish directory**: `dist/public`
- **Env vars**: set `VITE_API_URL` if you need to override the API base URL (defaults to `/api/v1` via Render's rewrite rules)
- **Rewrite rule**: `/* → /index.html` (SPA routing)
- **You also need** a Render rewrite to proxy `/api/*` → your API server URL, **or** configure `VITE_API_URL=https://your-api.onrender.com` and update `src/lib/api.ts` accordingly.

### Discord OAuth2 setup
1. Go to https://discord.com/developers/applications
2. Select your application → OAuth2
3. Add Redirect URI: `https://your-api.onrender.com/api/v1/auth/discord/callback`
4. Set `DISCORD_REDIRECT_URI` to that exact URL

## User preferences

- Keep the dark Discord-style theme (deep navy + violet accent).
- API uses ESM (`"type": "module"`) — always use `.js` extensions in imports.
- MongoDB/Mongoose for persistence; no PostgreSQL/Drizzle.
- TanStack Router v1 (file-based) for dashboard routing — no Wouter, no React Router.

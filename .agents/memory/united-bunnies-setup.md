---
name: United Bunnies Project Setup
description: Architecture, key decisions, and known quirks for the United Bunnies dashboard project.
---

## Services
- **Bot**: Python (discord.py), bot.py + mongo_bridge.py at workspace root. SQLite local store, syncs to MongoDB every 20s.
- **API Server**: artifacts/api-server/ — Express 4 + TypeScript + Mongoose. Dev uses tsx watch. No drizzle/postgres.
- **Dashboard**: artifacts/dashboard/ — React SPA, TanStack Router v1 (file-based), Framer Motion, shadcn/ui, Tailwind v4.

## API routing
- Dev: Vite proxy /api -> http://localhost:8080 (api-server PORT env var).
- lib/api.ts uses /api/v1 as base (relative URL), proxied through Vite in dev.
- Production (Render): need either a rewrite rule or VITE_API_URL env var.

## env.ts approach
- External credentials (MONGO_URI, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET) are optional so server starts without them in Replit preview.
- Server warns at startup if MONGO_URI is missing; auth endpoints fail gracefully.

**Why:** Allows testing the frontend UI in Replit without requiring all external services configured.

## Package choices
- express@4 (not 5) — @types/express@4 is in workspace catalog.
- mongoose@8 — connects when MONGO_URI is set; skips when absent.
- connect-mongo@5 — session persistence; falls back to memory store without MONGO_URI.
- Python3 is NOT available in this Replit nix environment; bot must be run on Render or separately.

import os
import re
import asyncio
import discord
from discord.ext import commands
import discord.app_commands as app_commands
from threading import Thread
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import requests  
import random
import datetime  
import sqlite3  
import sys
import yt_dlp
import aiohttp
import mongo_bridge

UTC = datetime.timezone.utc

# --- CORE CONFIGURATION & INTENTS ---
intents = discord.Intents.default()
intents.message_content = True 
intents.members = True 

# Setting the message prefix strictly to '?' for commands
bot = commands.Bot(command_prefix="?", intents=intents, help_command=None)

# --- TARGET ENFORCEMENT ROLE ID ---
REQUIRED_ROLE_ID = 1517514393141776506

BOT_STATUS_URL = os.getenv("BOT_STATUS_URL")
BOT_API_SECRET = os.getenv("BOT_API_SECRET")  # must match the dashboard's BOT_API_SECRET

# --- SUPPORT / DASHBOARD / INVITE LINKS ---
# Set these as environment variables on your host (Railway/Render/VPS/etc).
# Falling back to placeholders so the bot still boots if they're unset —
# update the placeholders below (or set the env vars) with your real links.
SUPPORT_SERVER_URL = os.getenv("SUPPORT_SERVER_URL", "https://discord.gg/YOUR_INVITE_CODE_HERE")
DASHBOARD_URL = os.getenv("DASHBOARD_URL", "https://your-dashboard-website.example.com")
INVITE_URL = os.getenv(
    "INVITE_URL",
    "https://discord.com/oauth2/authorize?client_id=1517342359388426351&permissions=0&integration_type=0&scope=bot+applications.commands",
)

# --- BRAND COLOR ---
BRAND_COLOR = 0x2f3136


def quick_embed(text: str, *, title: str | None = None) -> discord.Embed:
    """Wrap a plain status/error/confirmation message in a themed embed
    instead of sending raw text. Picks an accent color automatically based
    on the leading emoji so ❌/❗ errors read red, ✅ successes read green,
    ⚠️/🤫 warnings read gold, and everything else uses the brand color."""
    color = BRAND_COLOR
    if text.startswith(("❌", "❗", "🚫", "💔")):
        color = discord.Color.red().value
    elif text.startswith(("✅", "🎉", "🔓")):
        color = discord.Color.green().value
    elif text.startswith(("⚠️", "🤫", "🔒")):
        color = discord.Color.gold().value
    embed = discord.Embed(description=text, color=color, timestamp=datetime.datetime.now(UTC))
    if title:
        embed.title = title
    return embed

# --- AUTOMOD INITIALIZATION PARAMETERS ---
# --- LEGACY AUTOMOD DEFAULTS ---
# No longer used directly — on_message now reads live thresholds/actions from
# mongo_bridge.get_moderation_settings() (populated from the dashboard). Left
# here only as a reference for the bundled defaults in mongo_bridge.py.
BANNED_WORDS = ["badword1", "badword2", "toxictext"] 
MAX_EMOJIS = 5          
MAX_PINGS = 4           
CAPS_PERCENTAGE = 0.75  

user_message_cooldowns = {}
afk_users = {}
_recent_messages = {}  # user_id -> list of recent lowercased message contents (for dupMessages filter)

# --- LEVELING SYSTEM CONFIG ---
xp_cooldowns = {}  # user_id -> last xp grant timestamp
XP_COOLDOWN_SECONDS = 60
XP_MIN = 5
XP_MAX = 15

# --- TICKET SYSTEM CONFIG ---
TICKET_CATEGORY_NAME = "🎫 Tickets"

# --- MUSIC QUEUES ---
song_queues = {}
now_playing = {}      # guild_id -> currently playing track dict
song_volumes = {}     # guild_id -> float (0.0 - 2.0), default 1.0
loop_modes = {}        # guild_id -> "off" | "track" | "queue"

GIPHY_API_KEY = os.getenv("GIPHY_API_KEY") or os.getenv("GIPHY_KEY")

def fetch_giphy_gif_url(query: str):
    if not query:
        return None
    if not GIPHY_API_KEY:
        return None
    try:
        resp = requests.get(
            "https://api.giphy.com/v1/gifs/search",
            params={
                "q": query,
                "api_key": GIPHY_API_KEY,
                "limit": 30,
                "rating": "pg-13",
            },
            timeout=12,
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("data") or []
        if not results:
            return None
        pick = random.choice(results)
        images = pick.get("images") or {}
        chosen = (
            images.get("original")
            or images.get("downsized_large")
            or images.get("fixed_height")
            or images.get("fixed_width")
        )
        if not chosen:
            return None
        return chosen.get("url")
    except Exception:
        return None

# Create the modern slash command group structure for '/mod'
mod_group = app_commands.Group(
    name="mod", 
    description="🔨 Administrative Enforcement and Moderation commands deck."
)

# --- SLASH COMMAND ROLE CHECK PREDICATE ---
def has_required_slash_role():
    def predicate(interaction: discord.Interaction) -> bool:
        return any(role.id == REQUIRED_ROLE_ID for role in interaction.user.roles)
    return app_commands.check(predicate)

# --- KEEP-ALIVE SERVER (Prevents Render Timeouts) ---
class KeepAliveHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write(b"Bot is running 24/7!")

def run_server():
    port = int(os.environ.get("PORT", 8080))
    server = ThreadingHTTPServer(('0.0.0.0', port), KeepAliveHandler)
    print(f"📡 Internal web server listening on port {port}...")
    server.serve_forever()

async def check_permission(guild_id: int, feature: str) -> bool:
    """Returns True if allowed, False if disabled in dashboard"""
    if not db: return True
    doc = await db.guilds.find_one({"guildId": str(guild_id)})
    if not doc: return True
    # Block if module is off
    if doc.get("modules", {}).get(feature) is False: return False
    # Block if command is disabled
    if feature in doc.get("disabledCommands", []): return False
    return True
# --- PUBLISH BOT STATUS TO WEBSITE ---
async def publish_bot_status():
    """Sends bot health metrics + the real guild list to the website dashboard.

    Called once on_ready and then every 15s from status_loop() below. The
    guild list here is what powers the developer view's server picker on
    the dashboard (GET /api/bot/guilds) — no more hardcoded/demo servers.
    """
    if not BOT_STATUS_URL:
        return
    try:
        guilds_payload = [
            {
                "id": str(g.id),
                "name": g.name,
                "icon": str(g.icon.key) if g.icon else None,
                "memberCount": g.member_count or 0,
            }
            for g in bot.guilds
        ]
        payload = {
            "online": bot.is_ready(),
            "guildCount": len(bot.guilds),
            "memberCount": sum(g.member_count or 0 for g in bot.guilds),
            "ping": round(bot.latency * 1000) if bot.latency else 0,
            "guilds": guilds_payload,
        }
        headers = {"x-bot-secret": BOT_API_SECRET} if BOT_API_SECRET else {}
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
            async with session.post(BOT_STATUS_URL, json=payload, headers=headers) as resp:
                if resp.status != 200:
                    print(f"⚠️ Status post failed: {resp.status} {await resp.text()}")
    except Exception as e:
        print(f"❌ Error publishing bot status: {e}")

# --- PERSISTENT FILE DATABASE STRUCTURES ---
DB_FILE = "bot_data.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS warnings (
            user_id INTEGER PRIMARY KEY,
            warning_count INTEGER DEFAULT 0
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS server_config (
            guild_id INTEGER PRIMARY KEY,
            welcome_channel_id INTEGER DEFAULT 0,
            log_channel_id INTEGER DEFAULT 0,
            vouch_channel_id INTEGER DEFAULT NULL
        )
    """)
    # Migration: older databases (created before the vouch system existed)
    # won't have this column yet. ALTER TABLE ADD COLUMN is a safe way to
    # backfill it without losing existing welcome/log config.
    cursor.execute("PRAGMA table_info(server_config)")
    existing_cols = {row[1] for row in cursor.fetchall()}
    if "vouch_channel_id" not in existing_cols:
        cursor.execute("ALTER TABLE server_config ADD COLUMN vouch_channel_id INTEGER DEFAULT NULL")
    if "trusted_role_id" not in existing_cols:
        cursor.execute("ALTER TABLE server_config ADD COLUMN trusted_role_id INTEGER DEFAULT NULL")
    if "welcome_message" not in existing_cols:
        cursor.execute("ALTER TABLE server_config ADD COLUMN welcome_message TEXT DEFAULT NULL")
    if "levelup_channel_id" not in existing_cols:
        cursor.execute("ALTER TABLE server_config ADD COLUMN levelup_channel_id INTEGER DEFAULT NULL")
    if "levels_enabled" not in existing_cols:
        cursor.execute("ALTER TABLE server_config ADD COLUMN levels_enabled INTEGER DEFAULT 1")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS noprefix_users (
            guild_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            PRIMARY KEY (guild_id, user_id)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS role_menu_items (
            message_id INTEGER NOT NULL,
            guild_id INTEGER NOT NULL,
            channel_id INTEGER NOT NULL,
            role_id INTEGER NOT NULL,
            emoji TEXT,
            label TEXT NOT NULL,
            PRIMARY KEY (message_id, role_id)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS liked_songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            song_title TEXT,
            song_url TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vouches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id INTEGER NOT NULL,
            target_id INTEGER NOT NULL,
            author_id INTEGER NOT NULL,
            comment TEXT,
            created_at TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS levels (
            guild_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 0,
            PRIMARY KEY (guild_id, user_id)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reaction_roles (
            guild_id INTEGER NOT NULL,
            message_id INTEGER NOT NULL,
            emoji TEXT NOT NULL,
            role_id INTEGER NOT NULL,
            PRIMARY KEY (message_id, emoji)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tickets (
            channel_id INTEGER PRIMARY KEY,
            guild_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            status TEXT DEFAULT 'open',
            created_at TEXT
        )
    """)
    cursor.execute("PRAGMA table_info(tickets)")
    ticket_cols = {row[1] for row in cursor.fetchall()}
    if "ticket_type" not in ticket_cols:
        cursor.execute("ALTER TABLE tickets ADD COLUMN ticket_type TEXT DEFAULT 'General Support'")
    if "claimed_by" not in ticket_cols:
        cursor.execute("ALTER TABLE tickets ADD COLUMN claimed_by INTEGER DEFAULT NULL")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS marriages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id INTEGER NOT NULL,
            user1_id INTEGER NOT NULL,
            user2_id INTEGER NOT NULL,
            married_at TEXT
        )
    """)
    # Per-command role restrictions ("/cmdperm-allow", "/cmdperm-deny", etc).
    # A command with no rows here is open to everyone by default.
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS command_permissions (
            guild_id INTEGER NOT NULL,
            command_name TEXT NOT NULL,
            role_id INTEGER NOT NULL,
            PRIMARY KEY (guild_id, command_name, role_id)
        )
    """)
    # Custom auto-responder pairs ("/new-command"): trigger text -> response text.
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS custom_commands (
            guild_id INTEGER NOT NULL,
            trigger TEXT NOT NULL,
            response TEXT NOT NULL,
            created_by INTEGER,
            PRIMARY KEY (guild_id, trigger)
        )
    """)
    conn.commit()
    conn.close()

init_db()

# --- PLAYLIST DATABASE UTILITIES ---
def add_liked_song(user_id: int, title: str, url: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO liked_songs (user_id, song_title, song_url) VALUES (?, ?, ?)", (user_id, title, url))
    conn.commit()
    conn.close()

def get_liked_songs(user_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT song_title, song_url FROM liked_songs WHERE user_id = ?", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return rows

def clear_liked_songs(user_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM liked_songs WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

# --- GENERAL DB UTILITIES ---
def get_config(guild_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT welcome_channel_id, log_channel_id FROM server_config WHERE guild_id = ?", (guild_id,))
    row = cursor.fetchone()
    conn.close()
    return row if row else (0, 0)

def set_config(guild_id: int, col_name: str, channel_id: int):
    welcome, logs = get_config(guild_id)
    if col_name == "welcome": welcome = channel_id
    if col_name == "logs": logs = channel_id
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO server_config (guild_id, welcome_channel_id, log_channel_id)
        VALUES (?, ?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET welcome_channel_id = ?, log_channel_id = ?
    """, (guild_id, welcome, logs, welcome, logs))
    conn.commit()
    conn.close()

def get_warnings(user_id: int) -> int:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT warning_count FROM warnings WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else 0

def update_warnings(user_id: int, increment: int) -> int:
    current = get_warnings(user_id)
    new_total = max(0, current + increment)
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO warnings (user_id, warning_count) 
        VALUES (?, ?) 
        ON CONFLICT(user_id) DO UPDATE SET warning_count = ?
    """, (user_id, new_total, new_total))
    conn.commit()
    conn.close()
    return new_total

def reset_warnings(user_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM warnings WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

# --- NO-PREFIX PERMISSION DB UTILITIES ---
def get_trusted_role_id(guild_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT trusted_role_id FROM server_config WHERE guild_id = ?", (guild_id,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row and row[0] else None

def set_trusted_role_id(guild_id: int, role_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO server_config (guild_id, welcome_channel_id, log_channel_id, trusted_role_id)
        VALUES (?, 0, 0, ?)
        ON CONFLICT(guild_id) DO UPDATE SET trusted_role_id = ?
    """, (guild_id, role_id, role_id))
    conn.commit()
    conn.close()

def clear_trusted_role_id(guild_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("UPDATE server_config SET trusted_role_id = NULL WHERE guild_id = ?", (guild_id,))
    conn.commit()
    conn.close()

def grant_noprefix(guild_id: int, user_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO noprefix_users (guild_id, user_id) VALUES (?, ?)", (guild_id, user_id))
    conn.commit()
    conn.close()

def revoke_noprefix(guild_id: int, user_id: int) -> bool:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM noprefix_users WHERE guild_id = ? AND user_id = ?", (guild_id, user_id))
    changed = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return changed

def is_noprefix_user(guild_id: int, user_id: int) -> bool:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM noprefix_users WHERE guild_id = ? AND user_id = ?", (guild_id, user_id))
    row = cursor.fetchone()
    conn.close()
    return row is not None

def list_noprefix_users(guild_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT user_id FROM noprefix_users WHERE guild_id = ?", (guild_id,))
    rows = cursor.fetchall()
    conn.close()
    return [r[0] for r in rows]

def has_noprefix_perm(guild: discord.Guild, member: discord.Member) -> bool:
    """Staff (REQUIRED_ROLE_ID), the guild's trusted role, and individually-granted
    users are all allowed to run commands without the '?' prefix."""
    if any(r.id == REQUIRED_ROLE_ID for r in member.roles):
        return True
    trusted_id = get_trusted_role_id(guild.id)
    if trusted_id and any(r.id == trusted_id for r in member.roles):
        return True
    return is_noprefix_user(guild.id, member.id)


# --- VOUCH SYSTEM DB UTILITIES ---
def add_vouch(guild_id: int, target_id: int, author_id: int, comment: str = None):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO vouches (guild_id, target_id, author_id, comment, created_at) VALUES (?, ?, ?, ?, ?)",
        (guild_id, target_id, author_id, comment, datetime.datetime.now(UTC).isoformat()),
    )
    conn.commit()
    conn.close()

def remove_last_vouch(guild_id: int, target_id: int, author_id: int) -> bool:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id FROM vouches WHERE guild_id = ? AND target_id = ? AND author_id = ? ORDER BY id DESC LIMIT 1",
        (guild_id, target_id, author_id),
    )
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False
    cursor.execute("DELETE FROM vouches WHERE id = ?", (row[0],))
    conn.commit()
    conn.close()
    return True

def count_vouches(guild_id: int, target_id: int) -> int:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM vouches WHERE guild_id = ? AND target_id = ?", (guild_id, target_id))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else 0

def list_vouches(guild_id: int, target_id: int, limit: int = 5):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT author_id, comment, created_at FROM vouches WHERE guild_id = ? AND target_id = ? ORDER BY id DESC LIMIT ?",
        (guild_id, target_id, limit),
    )
    rows = cursor.fetchall()
    conn.close()
    return rows

def vouch_leaderboard(guild_id: int, limit: int = 10):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT target_id, COUNT(*) as c FROM vouches WHERE guild_id = ? GROUP BY target_id ORDER BY c DESC LIMIT ?",
        (guild_id, limit),
    )
    rows = cursor.fetchall()
    conn.close()
    return rows

# --- LEVELING SYSTEM DB UTILITIES ---
def xp_for_level(level: int) -> int:
    # Total XP required to reach this level. Gently increasing curve.
    return 5 * (level ** 2) + 50 * level + 100

def get_level_data(guild_id: int, user_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT xp, level FROM levels WHERE guild_id = ? AND user_id = ?", (guild_id, user_id))
    row = cursor.fetchone()
    conn.close()
    return row if row else (0, 0)

def add_xp(guild_id: int, user_id: int, amount: int):
    """Adds XP and returns (new_xp, new_level, leveled_up: bool)."""
    xp, level = get_level_data(guild_id, user_id)
    new_xp = xp + amount
    new_level = level
    while new_xp >= xp_for_level(new_level + 1):
        new_level += 1

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO levels (guild_id, user_id, xp, level) VALUES (?, ?, ?, ?)
        ON CONFLICT(guild_id, user_id) DO UPDATE SET xp = ?, level = ?
        """,
        (guild_id, user_id, new_xp, new_level, new_xp, new_level),
    )
    conn.commit()
    conn.close()
    return new_xp, new_level, new_level > level

def level_leaderboard(guild_id: int, limit: int = 10):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT user_id, xp, level FROM levels WHERE guild_id = ? ORDER BY xp DESC LIMIT ?",
        (guild_id, limit),
    )
    rows = cursor.fetchall()
    conn.close()
    return rows

# --- REACTION ROLES DB UTILITIES ---
def add_reaction_role(guild_id: int, message_id: int, emoji: str, role_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO reaction_roles (guild_id, message_id, emoji, role_id) VALUES (?, ?, ?, ?)
        ON CONFLICT(message_id, emoji) DO UPDATE SET role_id = ?
        """,
        (guild_id, message_id, emoji, role_id, role_id),
    )
    conn.commit()
    conn.close()

def remove_reaction_role(message_id: int, emoji: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM reaction_roles WHERE message_id = ? AND emoji = ?", (message_id, emoji))
    conn.commit()
    conn.close()

def get_reaction_role(message_id: int, emoji: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT role_id FROM reaction_roles WHERE message_id = ? AND emoji = ?", (message_id, emoji))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else None

# --- TICKET SYSTEM DB UTILITIES ---
def create_ticket_record(channel_id: int, guild_id: int, user_id: int, ticket_type: str = "General Support"):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO tickets (channel_id, guild_id, user_id, status, created_at, ticket_type) VALUES (?, ?, ?, 'open', ?, ?)",
        (channel_id, guild_id, user_id, datetime.datetime.now(UTC).isoformat(), ticket_type),
    )
    conn.commit()
    conn.close()

def close_ticket_record(channel_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("UPDATE tickets SET status = 'closed' WHERE channel_id = ?", (channel_id,))
    conn.commit()
    conn.close()

def claim_ticket_record(channel_id: int, staff_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("UPDATE tickets SET claimed_by = ? WHERE channel_id = ?", (staff_id, channel_id))
    conn.commit()
    conn.close()

def unclaim_ticket_record(channel_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("UPDATE tickets SET claimed_by = NULL WHERE channel_id = ?", (channel_id,))
    conn.commit()
    conn.close()

def get_ticket_record(channel_id: int):
    """Returns (user_id, status, ticket_type, claimed_by) or None."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, status, ticket_type, claimed_by FROM tickets WHERE channel_id = ?", (channel_id,))
    row = cursor.fetchone()
    conn.close()
    return row

def get_open_ticket_for_user(guild_id: int, user_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT channel_id FROM tickets WHERE guild_id = ? AND user_id = ? AND status = 'open'",
        (guild_id, user_id),
    )
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else None

def list_open_tickets(guild_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT channel_id, user_id, ticket_type, claimed_by, created_at FROM tickets WHERE guild_id = ? AND status = 'open' ORDER BY created_at ASC",
        (guild_id,),
    )
    rows = cursor.fetchall()
    conn.close()
    return rows


# --- DROPDOWN ROLE MENU DB UTILITIES ---
def add_role_menu_items(message_id: int, guild_id: int, channel_id: int, entries):
    """entries: list of (role_id, emoji, label) tuples"""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    for role_id, emoji, label in entries:
        cursor.execute(
            """
            INSERT INTO role_menu_items (message_id, guild_id, channel_id, role_id, emoji, label)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(message_id, role_id) DO UPDATE SET emoji = ?, label = ?
            """,
            (message_id, guild_id, channel_id, role_id, emoji, label, emoji, label),
        )
    conn.commit()
    conn.close()

def get_role_menu_items(message_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT role_id, emoji, label FROM role_menu_items WHERE message_id = ?", (message_id,))
    rows = cursor.fetchall()
    conn.close()
    return rows

def get_all_role_menu_message_ids():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT message_id FROM role_menu_items")
    rows = cursor.fetchall()
    conn.close()
    return [r[0] for r in rows]

def delete_role_menu(message_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM role_menu_items WHERE message_id = ?", (message_id,))
    conn.commit()
    conn.close()

# --- MARRIAGE SYSTEM DB UTILITIES ---
def get_marriage(guild_id: int, user_id: int):
    """Returns (id, user1_id, user2_id, married_at) if this user is married in this guild, else None."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, user1_id, user2_id, married_at FROM marriages WHERE guild_id = ? AND (user1_id = ? OR user2_id = ?)",
        (guild_id, user_id, user_id),
    )
    row = cursor.fetchone()
    conn.close()
    return row

def create_marriage(guild_id: int, user1_id: int, user2_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO marriages (guild_id, user1_id, user2_id, married_at) VALUES (?, ?, ?, ?)",
        (guild_id, user1_id, user2_id, datetime.datetime.now(UTC).isoformat()),
    )
    conn.commit()
    conn.close()

def delete_marriage(marriage_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM marriages WHERE id = ?", (marriage_id,))
    conn.commit()
    conn.close()

# --- WELCOMER MESSAGE DB UTILITIES ---
def get_welcome_message(guild_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT welcome_message FROM server_config WHERE guild_id = ?", (guild_id,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row and row[0] else None

def set_welcome_message(guild_id: int, message: str):
    welcome, logs = get_config(guild_id)
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO server_config (guild_id, welcome_channel_id, log_channel_id, welcome_message)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET welcome_message = ?
    """, (guild_id, welcome, logs, message, message))
    conn.commit()
    conn.close()

def clear_welcome_message(guild_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("UPDATE server_config SET welcome_message = NULL WHERE guild_id = ?", (guild_id,))
    conn.commit()
    conn.close()

def format_welcome_message(template: str, member: discord.Member) -> str:
    return (
        template.replace("{user}", member.mention)
        .replace("{username}", member.display_name)
        .replace("{server}", member.guild.name)
        .replace("{membercount}", str(member.guild.member_count))
    )

# --- LEVELING CONFIG DB UTILITIES ---
def get_levelup_channel(guild_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT levelup_channel_id FROM server_config WHERE guild_id = ?", (guild_id,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row and row[0] else None

def set_levelup_channel(guild_id: int, channel_id: int):
    welcome, logs = get_config(guild_id)
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO server_config (guild_id, welcome_channel_id, log_channel_id, levelup_channel_id)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET levelup_channel_id = ?
    """, (guild_id, welcome, logs, channel_id, channel_id))
    conn.commit()
    conn.close()

def clear_levelup_channel(guild_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("UPDATE server_config SET levelup_channel_id = NULL WHERE guild_id = ?", (guild_id,))
    conn.commit()
    conn.close()

def is_leveling_enabled(guild_id: int) -> bool:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT levels_enabled FROM server_config WHERE guild_id = ?", (guild_id,))
    row = cursor.fetchone()
    conn.close()
    if row is None or row[0] is None:
        return True
    return bool(row[0])

def set_leveling_enabled(guild_id: int, enabled: bool):
    welcome, logs = get_config(guild_id)
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO server_config (guild_id, welcome_channel_id, log_channel_id, levels_enabled)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET levels_enabled = ?
    """, (guild_id, welcome, logs, int(enabled), int(enabled)))
    conn.commit()
    conn.close()

# --- COMMAND PERMISSIONS DB UTILITIES ---
def get_command_permission_roles(guild_id: int, command_name: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT role_id FROM command_permissions WHERE guild_id = ? AND command_name = ?",
        (guild_id, command_name),
    )
    rows = cursor.fetchall()
    conn.close()
    return [r[0] for r in rows]

def add_command_permission(guild_id: int, command_name: str, role_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR IGNORE INTO command_permissions (guild_id, command_name, role_id) VALUES (?, ?, ?)",
        (guild_id, command_name, role_id),
    )
    conn.commit()
    conn.close()

def remove_command_permission(guild_id: int, command_name: str, role_id: int) -> bool:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM command_permissions WHERE guild_id = ? AND command_name = ? AND role_id = ?",
        (guild_id, command_name, role_id),
    )
    changed = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return changed

def reset_command_permissions(guild_id: int, command_name: str) -> bool:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM command_permissions WHERE guild_id = ? AND command_name = ?",
        (guild_id, command_name),
    )
    changed = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return changed

def list_command_permissions(guild_id: int):
    """Returns {command_name: [role_id, ...]} for every restricted command in this guild."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT command_name, role_id FROM command_permissions WHERE guild_id = ? ORDER BY command_name",
        (guild_id,),
    )
    rows = cursor.fetchall()
    conn.close()
    result = {}
    for cmd, role_id in rows:
        result.setdefault(cmd, []).append(role_id)
    return result

# --- CUSTOM AUTO-RESPONDER ("NEW COMMAND") DB UTILITIES ---
def add_custom_command(guild_id: int, trigger: str, response: str, created_by: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO custom_commands (guild_id, trigger, response, created_by) VALUES (?, ?, ?, ?)
        ON CONFLICT(guild_id, trigger) DO UPDATE SET response = ?, created_by = ?
        """,
        (guild_id, trigger, response, created_by, response, created_by),
    )
    conn.commit()
    conn.close()

def remove_custom_command(guild_id: int, trigger: str) -> bool:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM custom_commands WHERE guild_id = ? AND trigger = ?", (guild_id, trigger))
    changed = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return changed

def get_custom_command(guild_id: int, trigger: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT response FROM custom_commands WHERE guild_id = ? AND trigger = ?", (guild_id, trigger))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else None

def list_custom_commands(guild_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT trigger, response FROM custom_commands WHERE guild_id = ? ORDER BY trigger", (guild_id,))
    rows = cursor.fetchall()
    conn.close()
    return rows

# --- GLOBAL PER-COMMAND PERMISSION CHECK ---
# Commands with no configured roles stay open to everyone (opt-in restriction
# model). Staff (REQUIRED_ROLE_ID) always bypass restrictions so they can
# never lock themselves out. Applies to every prefix/hybrid command; pure
# app_commands.Group commands (like /mod ...) already gate on the staff role.
CMDPERM_EXEMPT_COMMANDS = {"cmdperm-allow", "cmdperm-deny", "cmdperm-list", "cmdperm-reset", "help"}

@bot.check
async def global_command_permission_check(ctx: commands.Context) -> bool:
    if ctx.guild is None or ctx.command is None:
        return True
    cmd_name = ctx.command.qualified_name.split(" ")[0]
    if cmd_name in CMDPERM_EXEMPT_COMMANDS:
        return True
    if mongo_bridge.is_command_disabled(ctx.guild.id, cmd_name):
        raise commands.CheckFailure("🔒 This command has been disabled on the dashboard for this server.")
    allowed_roles = get_command_permission_roles(ctx.guild.id, cmd_name)
    if not allowed_roles:
        return True
    member = ctx.author
    if isinstance(member, discord.Member):
        if any(r.id == REQUIRED_ROLE_ID for r in member.roles):
            return True
        if any(r.id in allowed_roles for r in member.roles):
            return True
    raise commands.CheckFailure("🔒 This command is restricted to specific roles here. Ask a staff member for access.")

# --- SYNC MODERN SLASH COMMAND TREES ---
@bot.event
async def on_ready():
    bot.tree.add_command(mod_group) 
    print(f"✨ Success! {bot.user.name} is online.")
    await publish_bot_status()

    # Re-register persistent views (buttons with custom_id) so they keep
    # working after a restart, not just for the session that created them.
    bot.add_view(TicketPanelView())
    bot.add_view(TicketManageView())
    bot.add_view(ControlPanelView())

    # Dropdown self-role menus are dynamic (their options differ per message),
    # so each stored menu needs its own view instance registered against its message ID.
    try:
        for msg_id in get_all_role_menu_message_ids():
            items = get_role_menu_items(msg_id)
            if items:
                bot.add_view(RoleMenuView(msg_id, items), message_id=msg_id)
    except Exception as e:
        print(f"⚠️ Failed to re-register role menus: {e}")

    try:
        synced = await bot.tree.sync()
        print(f"🔄 Successfully synced {len(synced)} slash commands globally!")
    except Exception as e:
        print(f"❌ Failed to sync slash commands: {e}")

    async def status_loop():
        while not bot.is_closed():
            await publish_bot_status()
            await asyncio.sleep(15)

    bot.loop.create_task(status_loop())

    # Dashboard sync: pulls command toggles / custom commands / auto-responses
    # from the same MongoDB the website writes to, so changes made on the
    # dashboard actually take effect here. Safe no-op if MONGO_URI is unset.
    await mongo_bridge.connect()
    bot.loop.create_task(mongo_bridge.refresh_loop())
    bot.loop.create_task(reaction_panel_post_loop())
    bot.loop.create_task(leaderboard_push_loop())

# --- GUILD LIST FRESHNESS ---
@bot.event
async def on_guild_join(guild):
    print(f"➕ Joined guild: {guild.name} ({guild.id})")
    await publish_bot_status()

@bot.event
async def on_guild_remove(guild):
    print(f"➖ Removed from guild: {guild.name} ({guild.id})")
    await publish_bot_status()

# --- AUTOMOD EVENT LOOPS & GREETINGS SYSTEMS ---
@bot.event
async def on_member_join(member):
    # --- DASHBOARD WELCOME/GOODBYE ("Welcome / Goodbye" tab) ---
    # Managed on the dashboard (Mongo), so it's checked first and takes
    # priority over the older SQLite-based welcomer below, mirroring the
    # dashboard-first pattern used for custom commands / auto-responses.
    if mongo_bridge.enabled():
        join_cfg = mongo_bridge.get_welcome_settings(member.guild.id).get("join", {})
        if join_cfg.get("enabled"):
            channel_name = (join_cfg.get("channelName") or "").lstrip("#")
            channel = discord.utils.get(member.guild.text_channels, name=channel_name) if channel_name else None
            if channel:
                text = mongo_bridge.substitute_variables(
                    join_cfg.get("message") or "Welcome {user} to **{server}**!",
                    member=member, guild=member.guild, channel=channel,
                )
                if join_cfg.get("embed"):
                    embed = discord.Embed(
                        description=text,
                        color=discord.Color.green(),
                        timestamp=datetime.datetime.now(UTC),
                    )
                    if join_cfg.get("imageUrl"):
                        embed.set_image(url=join_cfg["imageUrl"])
                    if join_cfg.get("thumbnailUrl"):
                        embed.set_thumbnail(url=join_cfg["thumbnailUrl"])
                    if join_cfg.get("footer"):
                        embed.set_footer(text=join_cfg["footer"])
                    await channel.send(embed=embed)
                else:
                    await channel.send(text)
                return

    # --- LEGACY SQLITE WELCOMER (predates the dashboard) ---
    # Only runs if the dashboard join message isn't enabled/configured, so
    # servers that haven't touched the new "Welcome / Goodbye" tab keep
    # their existing behavior exactly as before.
    welcome_id, _ = get_config(member.guild.id)
    if welcome_id:
        channel = bot.get_channel(welcome_id)
        if channel:
            custom_template = get_welcome_message(member.guild.id)
            if custom_template:
                description = format_welcome_message(custom_template, member)
            else:
                description = f"Welcome {member.mention}! We are thrilled to have you here.\nTake a look around and make yourself comfortable!"
            embed = discord.Embed(
                title=f"👋 Welcome to {member.guild.name}!",
                description=description,
                color=discord.Color.green(),
                timestamp=datetime.datetime.now(UTC)
            )
            embed.set_thumbnail(url=member.display_avatar.url)
            embed.set_image(url="https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif")
            embed.set_footer(text=f"Member Count Total: {member.guild.member_count}")
            await channel.send(content=member.mention, embed=embed)


@bot.event
async def on_member_remove(member):
    # --- DASHBOARD WELCOME/GOODBYE ("Welcome / Goodbye" tab) ---
    # No legacy leave/goodbye system exists in the SQLite era, so this is
    # purely additive — nothing to fall back to or preserve here.
    if not member.guild or not mongo_bridge.enabled():
        return
    leave_cfg = mongo_bridge.get_welcome_settings(member.guild.id).get("leave", {})
    if not leave_cfg.get("enabled"):
        return
    channel_name = (leave_cfg.get("channelName") or "").lstrip("#")
    channel = discord.utils.get(member.guild.text_channels, name=channel_name) if channel_name else None
    if not channel:
        return
    text = mongo_bridge.substitute_variables(
        leave_cfg.get("message") or "{user} has left {server}.",
        member=member, guild=member.guild, channel=channel,
    )
    await channel.send(text)

@bot.event
async def on_message_delete(message):
    if message.author.bot or not message.guild: return
    _, log_id = get_config(message.guild.id)
    if log_id:
        channel = bot.get_channel(log_id)
        if channel:
            embed = discord.Embed(title="🗑️ Message Deleted", color=discord.Color.red(), timestamp=datetime.datetime.now(UTC))
            embed.add_field(name="Author Profile", value=f"{message.author.mention} (`{message.author.id}`)", inline=True)
            embed.add_field(name="Location Stream", value=message.channel.mention, inline=True)
            embed.add_field(name="Deleted Payload Content", value=message.content or "*No text payload (image/embed)*", inline=False)
            await channel.send(embed=embed)

@bot.event
async def on_message_edit(before, after):
    if before.author.bot or before.content == after.content or not before.guild: return
    _, log_id = get_config(before.guild.id)
    if log_id:
        channel = bot.get_channel(log_id)
        if channel:
            embed = discord.Embed(title="📝 Message Edited", color=discord.Color.orange(), timestamp=datetime.datetime.now(UTC))
            embed.add_field(name="Author Profile", value=f"{before.author.mention}", inline=True)
            embed.add_field(name="Location Stream", value=before.channel.mention, inline=True)
            embed.add_field(name="Original Payload", value=before.content, inline=False)
            embed.add_field(name="Edited Revision Payload", value=after.content, inline=False)
            await channel.send(embed=embed)

# ==========================================
#         ✅ VOUCHING SYSTEM
# ==========================================

# Configuration Limits
MAX_REASON_LENGTH = 300

# Regular expression to extract: "vouch @user for [reason]"
VOUCH_PATTERN = re.compile(
    r"\bvouch(?:es|ed|ing)?\b.*?<@!?(?P<id>\d+)>\s*(?:for\s+)?(?P<reason>.*)",
    re.IGNORECASE | re.DOTALL,
)

def get_vouch_channel(guild_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT vouch_channel_id FROM server_config WHERE guild_id = ?", (guild_id,))
    row = cursor.fetchone()
    conn.close()
    if row and row[0]:
        return row[0]
    return None

def set_vouch_channel(guild_id: int, channel_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO server_config (guild_id, welcome_channel_id, log_channel_id, vouch_channel_id)
        VALUES (?, 0, 0, ?)
        ON CONFLICT(guild_id) DO UPDATE SET vouch_channel_id = ?
    """, (guild_id, channel_id, channel_id))
    conn.commit()
    conn.close()

def clear_vouch_channel(guild_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("UPDATE server_config SET vouch_channel_id = NULL WHERE guild_id = ?", (guild_id,))
    conn.commit()
    conn.close()

async def _check_vouch_channel(ctx: commands.Context) -> bool:
    """Helper function to verify if the command is run in the allowed channel."""
    vouch_channel_id = get_vouch_channel(ctx.guild.id)
    if vouch_channel_id is None or ctx.channel.id == vouch_channel_id:
        return True
    await ctx.send(embed=quick_embed(f"❌ Vouching commands are restricted to <#{vouch_channel_id}> in this server."))
    return False

# ----------------- Commands -----------------

@bot.hybrid_command(name="vouch", description="Vouch for a user")
@commands.guild_only()
@app_commands.describe(member="User to vouch for", comment="Optional comment (e.g. what for)")
async def vouch_prefix(ctx: commands.Context, member: discord.Member = None, *, comment: str = None):
    # If a member is tagged but no comment is provided, redirect to showing their profile status
    if member is not None and comment is None:
        await vouches_prefix(ctx, member)
        return

    if member is None:
        await ctx.send(embed=quick_embed(f"❌ Syntax: `{ctx.prefix}vouch @user [comment]`"))
        return
        
    if not await _check_vouch_channel(ctx):
        return
        
    if member.id == ctx.author.id:
        await ctx.send(embed=quick_embed("❌ You can't vouch for yourself."))
        return
    if member.bot:
        await ctx.send(embed=quick_embed("❌ You can't vouch for a bot."))
        return

    add_vouch(ctx.guild.id, member.id, ctx.author.id, comment)
    total = count_vouches(ctx.guild.id, member.id)

    embed = discord.Embed(
        description=f"✅ {ctx.author.mention} vouched for {member.mention}",
        color=discord.Color.green(),
    )
    if comment:
        embed.add_field(name="Comment", value=comment, inline=False)
    embed.set_footer(text=f"{member.display_name} now has {total} vouch(es)")
    await ctx.send(embed=embed)


@bot.hybrid_command(name="unvouch", description="Remove your most recent vouch for a user")
@commands.guild_only()
@app_commands.describe(member="User to remove your vouch from")
async def unvouch_prefix(ctx: commands.Context, member: discord.Member = None):
    if member is None:
        await ctx.send(embed=quick_embed(f"❌ Syntax: `{ctx.prefix}unvouch @user`"))
        return
        
    if not await _check_vouch_channel(ctx):
        return
        
    removed = remove_last_vouch(ctx.guild.id, member.id, ctx.author.id)
    if removed:
        await ctx.send(embed=quick_embed(f"Removed your vouch for {member.mention}."))
    else:
        await ctx.send(embed=quick_embed(f"You haven't vouched for {member.mention}."))


@bot.hybrid_command(name="vouches", description="Show vouches for a user")
@commands.guild_only()
@app_commands.describe(member="User to check (defaults to yourself)")
async def vouches_prefix(ctx: commands.Context, member: discord.Member = None):
    member = member or ctx.author
    
    total = count_vouches(ctx.guild.id, member.id)
    recent = list_vouches(ctx.guild.id, member.id, limit=5)

    embed = discord.Embed(
        title=f"Vouches for {member.display_name}",
        description=f"**Total:** {total}",
        color=discord.Color.gold(),
    )
    embed.set_thumbnail(url=member.display_avatar.url)

    if recent:
        lines = []
        for author_id, comment, created_at in recent:
            author = ctx.guild.get_member(author_id)
            author_name = author.mention if author else f"<@{author_id}>"
            line = f"- {author_name}"
            if comment:
                line += f" — {comment}"
            lines.append(line)
        embed.add_field(name="Recent", value="\n".join(lines), inline=False)

    await ctx.send(embed=embed)


@bot.hybrid_command(name="vouchleaderboard", aliases=["vouchlb"], description="Show the most-vouched users in this server")
@commands.guild_only()
async def vouch_leaderboard_prefix(ctx: commands.Context):
    rows = vouch_leaderboard(ctx.guild.id, limit=10)
    if not rows:
        await ctx.send(embed=quick_embed("No vouches yet in this server."))
        return
        
    lines = []
    for i, (target_id, c) in enumerate(rows, start=1):
        member = ctx.guild.get_member(target_id)
        name = member.mention if member else f"<@{target_id}>"
        lines.append(f"**{i}.** {name} — {c} vouch(es)")
        
    embed = discord.Embed(
        title="🏆 Vouch Leaderboard", 
        description="\n".join(lines), 
        color=discord.Color.gold()
    )
    await ctx.send(embed=embed)


# ------------- Configuration -------------

@bot.hybrid_command(name="setvouchchannel", description="[Mod] Set the channel where vouching happens")
@commands.guild_only()
@commands.has_permissions(manage_guild=True)
@app_commands.describe(channel="The channel to dedicate to vouching")
async def set_vouch_channel_prefix(ctx: commands.Context, channel: discord.TextChannel):
    """Restricts vouching and tracking to a single dedicated text channel."""
    set_vouch_channel(ctx.guild.id, channel.id)
    embed = discord.Embed(
        description=f"✅ Vouch channel successfully set to {channel.mention}.\n\nUsers can now chat normally here to issue auto-vouches, or use manual lookup commands.",
        color=discord.Color.green()
    )
    await ctx.send(embed=embed)


@bot.hybrid_command(name="clearvouchchannel", description="[Mod] Remove the vouch channel restriction")
@commands.guild_only()
@commands.has_permissions(manage_guild=True)
async def clear_vouch_channel_prefix(ctx: commands.Context):
    """Removes the channel restriction so vouch commands work everywhere."""
    clear_vouch_channel(ctx.guild.id)
    await ctx.send(embed=quick_embed("✅ Vouch channel restriction cleared. Vouch commands will now work across all channels."))


# ==========================================
#      🔓 NO-PREFIX COMMAND EXECUTION
# ==========================================
# Commands that change server/member state enough that a typo or joke
# message could cause real damage if it fired instantly with no prefix.
# These always get a Confirm/Cancel button before running when triggered
# without "?".
NOPREFIX_CONFIRM_COMMANDS = {
    "warn", "clearwarnings", "mute", "unmute", "kick", "ban", "unban", "bon",
}

async def run_message_as_command(message: discord.Message):
    """Re-parses a plain (non-prefixed) message as if it had been sent with
    the bot's '?' prefix, then invokes it."""
    original_content = message.content
    message.content = "?" + original_content
    try:
        ctx = await bot.get_context(message)
        if ctx.valid:
            await bot.invoke(ctx)
    finally:
        message.content = original_content

class NoPrefixModConfirmView(discord.ui.View):
    def __init__(self, message: discord.Message, author: discord.Member):
        super().__init__(timeout=30)
        self.message = message
        self.author = author

    async def on_timeout(self):
        for item in self.children:
            item.disabled = True

    @discord.ui.button(label="Confirm", style=discord.ButtonStyle.danger, emoji="✅")
    async def confirm(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.author.id:
            await interaction.response.send_message(embed=quick_embed("❌ Only the person who typed this command can confirm it."), ephemeral=True)
            return
        for item in self.children:
            item.disabled = True
        await interaction.response.edit_message(content="✅ **Confirmed — executing...**", view=self)
        await run_message_as_command(self.message)
        self.stop()

    @discord.ui.button(label="Cancel", style=discord.ButtonStyle.secondary, emoji="✖️")
    async def cancel(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.author.id:
            await interaction.response.send_message(embed=quick_embed("❌ Only the person who typed this command can cancel it."), ephemeral=True)
            return
        for item in self.children:
            item.disabled = True
        await interaction.response.edit_message(content="❌ **Cancelled.** No action was taken.", view=self)
        self.stop()

async def send_noprefix_confirmation(message: discord.Message, command_name: str):
    view = NoPrefixModConfirmView(message, message.author)
    await message.reply(
        f"⚠️ You typed a **moderation command** (`{command_name}`) without the `?` prefix.\n"
        f"Run `{message.content}`?",
        view=view,
        mention_author=False,
    )


# --- STRIP-CHECK / AUTOMOD / AFK / LEVELING / VOUCH ON_MESSAGE HANDLER ---
# NOTE: There is only ONE on_message handler. discord.py only keeps the
# last @bot.event-registered on_message, so all message-driven behavior
# (AFK clearing, automod, XP grants, and the vouch auto-listener) has to
# live in this single function or the earlier registrations get silently
# dropped.

async def handle_leveling(message):
    """Grants XP for a message per the dashboard's Leveling settings
    (falling back to the legacy hardcoded defaults / SQLite toggle if
    there's no Mongo connection), sends a level-up message, and applies
    any role rewards for the new level."""
    guild = message.guild
    author = message.author
    settings = mongo_bridge.get_leveling_settings(guild.id) if mongo_bridge.enabled() else {
        **mongo_bridge.DEFAULT_LEVELING_SETTINGS, "enabled": is_leveling_enabled(guild.id),
        "xpMin": XP_MIN, "xpMax": XP_MAX, "cooldownSeconds": XP_COOLDOWN_SECONDS,
    }
    if not settings.get("enabled", True):
        return
    if mongo_bridge.enabled() and mongo_bridge.is_leveling_ignored(guild.id, author, message.channel):
        return

    now = datetime.datetime.now()
    last_grant = xp_cooldowns.get(author.id)
    if last_grant and (now - last_grant).total_seconds() < settings["cooldownSeconds"]:
        return
    xp_cooldowns[author.id] = now

    gained = random.randint(settings["xpMin"], settings["xpMax"])
    new_xp, new_level, leveled_up = add_xp(guild.id, author.id, gained)
    if not leveled_up:
        return

    # Role rewards: grant the highest-threshold role the member has reached.
    # stackRoles=True keeps every lower-tier reward role too; False swaps up.
    rewards = sorted(settings.get("roleRewards", []), key=lambda r: r.get("level", 0))
    earned = [r for r in rewards if r.get("level", 0) <= new_level]
    if earned:
        try:
            top_role = discord.utils.get(guild.roles, name=earned[-1]["roleName"])
            if top_role and top_role not in author.roles:
                await author.add_roles(top_role, reason=f"Leveling reward: reached level {new_level}")
            if not settings.get("stackRoles", True):
                lower_role_names = {r["roleName"] for r in earned[:-1]}
                lower_roles = [r for r in author.roles if r.name in lower_role_names]
                if lower_roles:
                    await author.remove_roles(*lower_roles, reason="Leveling reward: superseded by a higher tier")
        except discord.Forbidden:
            pass

    embed = discord.Embed(
        description=f"🎉 **{author.display_name}** leveled up to **Level {new_level}**!",
        color=discord.Color.gold(),
    )
    channel_name = settings.get("levelupChannelName")
    target_channel = discord.utils.get(guild.text_channels, name=channel_name) if channel_name else None
    if not target_channel:
        legacy_channel_id = get_levelup_channel(guild.id)
        target_channel = bot.get_channel(legacy_channel_id) if legacy_channel_id else message.channel
    if target_channel:
        await target_channel.send(embed=embed, delete_after=10)


async def leaderboard_push_loop():
    """Every ~60s, snapshots the top 10 XP earners per guild into MongoDB so
    the dashboard's Leveling tab can show a real leaderboard without needing
    a live connection into the bot's SQLite database."""
    await bot.wait_until_ready()
    while not bot.is_closed():
        if mongo_bridge.enabled():
            for guild in bot.guilds:
                rows = level_leaderboard(guild.id, limit=10)
                entries = []
                for user_id, xp, level in rows:
                    member = guild.get_member(user_id)
                    entries.append({
                        "userId": str(user_id),
                        "username": member.display_name if member else f"User {user_id}",
                        "avatarUrl": str(member.display_avatar.url) if member else None,
                        "xp": xp,
                        "level": level,
                    })
                await mongo_bridge.push_leaderboard(guild.id, entries)
        await asyncio.sleep(60)


@bot.event
async def on_message(message):
    if message.author.bot or not message.guild:
        return

    if message.author.id in afk_users:
        data = afk_users.pop(message.author.id)
        try: await message.author.edit(nick=data["old_name"])
        except Exception: pass
        await message.channel.send(embed=quick_embed(f"👋 Welcome back {message.author.mention}! Your AFK status has been cleared."), delete_after=5)

    for mention in message.mentions:
        if mention.id in afk_users:
            data = afk_users[mention.id]
            embed = discord.Embed(description=f"💤 **{mention.display_name}** is currently AFK: `{data['reason']}`", color=discord.Color.light_grey())
            await message.channel.send(embed=embed, delete_after=6)

    # --- Vouch channel auto-listener (natural-language "vouch @user for X") ---
    vouch_channel_id = get_vouch_channel(message.guild.id)
    if vouch_channel_id and message.channel.id == vouch_channel_id:
        ctx = await bot.get_context(message)
        if ctx.valid:
            await bot.process_commands(message)
            return

        match = VOUCH_PATTERN.search(message.content)
        if match:
            target_id = int(match.group("id"))
            target = message.guild.get_member(target_id)

            if not target:
                return
            if target.id == message.author.id:
                await message.reply("❌ You can't vouch for yourself.", mention_author=False)
                return
            if target.bot:
                await message.reply("❌ You can't vouch for a bot.", mention_author=False)
                return

            reason = match.group("reason").strip(" .,!") or None
            if reason and len(reason) > MAX_REASON_LENGTH:
                reason = reason[:MAX_REASON_LENGTH].rstrip() + "…"

            add_vouch(message.guild.id, target.id, message.author.id, reason)
            total = count_vouches(message.guild.id, target.id)

            embed = discord.Embed(
                description=f"✅ {message.author.mention} vouched for {target.mention}",
                color=discord.Color.green(),
            )
            if reason:
                embed.add_field(name="Comment", value=reason, inline=False)
            embed.set_footer(text=f"{target.display_name} now has {total} vouch(es)")

            await message.reply(embed=embed, mention_author=False)
            return

    # --- DASHBOARD CUSTOM COMMANDS (from the website's "Custom Commands" tab) ---
    # These are managed on the dashboard (Mongo), so they're checked first and
    # take priority over the older SQLite-based custom command system below.
    dash_cmd = mongo_bridge.check_and_consume_custom_command(message.guild.id, message)
    if dash_cmd:
        text = mongo_bridge.substitute_variables(
            dash_cmd.get("response", ""), member=message.author, guild=message.guild, channel=message.channel
        )
        if dash_cmd.get("deleteInvoke"):
            try:
                await message.delete()
            except Exception:
                pass
        if dash_cmd.get("replyType") == "dm":
            try:
                await message.author.send(text)
            except Exception:
                pass
        elif dash_cmd.get("replyType") == "embed":
            await message.channel.send(embed=quick_embed(text))
        else:
            await message.channel.send(text)
        await mongo_bridge.bump_uses("customCommands", dash_cmd.get("_id"))
        return

    # --- DASHBOARD AUTO-RESPONDER (from the website's "Auto Responder" tab) ---
    dash_auto = mongo_bridge.check_and_consume_auto_response(message.guild.id, message)
    if dash_auto:
        text = mongo_bridge.substitute_variables(
            dash_auto.get("response", ""), member=message.author, guild=message.guild, channel=message.channel
        )
        if dash_auto.get("deleteInvoke"):
            try:
                await message.delete()
            except Exception:
                pass
        await message.channel.send(text)
        await mongo_bridge.bump_uses("autoResponses", dash_auto.get("_id"))
        return

    # --- CUSTOM AUTO-RESPONDER ("if someone writes X, bot sends Y") ---
    # Legacy SQLite-based system (predates the dashboard). Checked before
    # prefix/command handling so it works regardless of "?" and regardless
    # of role — anyone can trigger a custom auto-response.
    custom_response = get_custom_command(message.guild.id, message.content.strip().lower())
    if custom_response:
        await message.channel.send(custom_response)
        return

    if message.content.strip().startswith("?"):
        await bot.process_commands(message)
        return

    # --- NO-PREFIX COMMAND EXECUTION ---
    # Users granted no-prefix permission (staff, the trusted role, or an
    # individual grant) can run any bot command by typing it plain, e.g.
    # "kiss @user" or "ban @user spamming". Moderation-impact commands
    # still require a click-to-confirm step since there's no prefix to
    # signal "this is a command" and mistakes here are hard to undo.
    first_word = message.content.strip().split(" ")[0].lower() if message.content.strip() else ""
    candidate_command = bot.get_command(first_word) if first_word else None
    if candidate_command and has_noprefix_perm(message.guild, message.author):
        if first_word in NOPREFIX_CONFIRM_COMMANDS:
            await send_noprefix_confirmation(message, first_word)
        else:
            await run_message_as_command(message)
        return

    if message.author.guild_permissions.manage_messages:
        return

    now = datetime.datetime.now()
    author_id = message.author.id
    settings = mongo_bridge.get_moderation_settings(message.guild.id)
    am = settings["automod"]

    if mongo_bridge.enabled() and mongo_bridge.is_ignored(message.guild.id, message.author, message.channel):
        # Still let leveling/commands run for exempt members — just skip automod.
        await handle_leveling(message)
        await bot.process_commands(message)
        return

    async def log_automod_action(reason_text: str):
        log_name = settings.get("logChannelName")
        if not log_name:
            return
        channel = discord.utils.get(message.guild.text_channels, name=log_name)
        if not channel:
            return
        embed = discord.Embed(
            description=f"🛡️ **{message.author.mention}** in {message.channel.mention}: {reason_text}",
            color=discord.Color.orange(),
        )
        try:
            await channel.send(embed=embed)
        except Exception:
            pass

    async def apply_automod_action(action: str, reason_text: str, duration_minutes: int = 10):
        current_warns = update_warnings(author_id, 1)
        try:
            await message.delete()
        except Exception:
            pass
        await log_automod_action(f"{reason_text} → action: `{action}`")

        if action == "warn":
            if current_warns >= 3:
                reset_warnings(author_id)
                try:
                    await message.author.timeout(datetime.timedelta(minutes=10), reason="AutoMod Violation Threshold")
                    await message.channel.send(embed=quick_embed(f"🤫 **{message.author.display_name}** has been auto-timed out for 10 minutes after receiving 3 warnings."))
                except Exception:
                    pass
            else:
                await message.channel.send(embed=quick_embed(f"⚠️ **{message.author.display_name}**, your message was removed for **{reason_text}**. ({current_warns}/3)"), delete_after=6)
        elif action == "mute":
            try:
                await message.author.timeout(datetime.timedelta(minutes=duration_minutes), reason=f"AutoMod: {reason_text}")
                await message.channel.send(embed=quick_embed(f"🔇 **{message.author.display_name}** was muted for {duration_minutes}m — {reason_text}."), delete_after=8)
            except Exception:
                pass
        elif action == "kick":
            try:
                await message.author.kick(reason=f"AutoMod: {reason_text}")
                await message.channel.send(embed=quick_embed(f"👢 **{message.author.display_name}** was kicked — {reason_text}."), delete_after=8)
            except Exception:
                pass
        elif action == "ban":
            try:
                await message.author.ban(reason=f"AutoMod: {reason_text}")
                await message.channel.send(embed=quick_embed(f"🔨 **{message.author.display_name}** was banned — {reason_text}."), delete_after=8)
            except Exception:
                pass
        # action == "delete" falls through — message is already gone above.

    # Legacy fallback path when there's no dashboard/Mongo connection at all,
    # so the bot still has *some* automod instead of none.
    async def issue_warning(reason_text):
        await apply_automod_action("warn", reason_text)

    if am["antiSpam"]["enabled"]:
        if author_id in user_message_cooldowns:
            timestamps = user_message_cooldowns[author_id]
            timestamps = [t for t in timestamps if (now - t).total_seconds() < am["antiSpam"]["interval"]]
            timestamps.append(now)
            user_message_cooldowns[author_id] = timestamps
            if len(timestamps) > am["antiSpam"]["maxMsgs"]:
                await apply_automod_action(am["antiSpam"]["action"], "Spamming messages too fast", am["antiSpam"]["duration"])
                return
        else:
            user_message_cooldowns[author_id] = [now]

    if am["massPing"]["enabled"] and ((len(message.mentions) + len(message.role_mentions)) > am["massPing"]["maxPings"] or message.mention_everyone):
        await apply_automod_action(am["massPing"]["action"], "Mass ping violations", am["massPing"]["duration"])
        return

    msg_lower = message.content.lower()

    if am["invites"]["enabled"] and ("discord.gg/" in msg_lower or "discord.com/invite/" in msg_lower):
        own_code = getattr(message.guild, "vanity_url_code", None)
        is_own_invite = bool(am["invites"]["allowOwn"] and own_code and own_code.lower() in msg_lower)
        if not is_own_invite:
            await apply_automod_action(am["invites"]["action"], "Advertising external invite links")
            return

    if am["linkFilter"]["enabled"]:
        urls = re.findall(r"https?://([\w.-]+)", msg_lower)
        if urls:
            mode = am["linkFilter"]["mode"]
            if mode == "blacklist":
                blocked = any(any(bad.lower() in url for bad in am["linkFilter"]["blacklist"]) for url in urls)
            else:  # whitelist mode — block anything NOT explicitly allowed
                allowed = [w.lower() for w in am["linkFilter"]["whitelist"]]
                blocked = any(not any(ok in url for ok in allowed) for url in urls)
            if blocked:
                await apply_automod_action(am["linkFilter"]["action"], "Posted a disallowed link")
                return

    if am["emojiSpam"]["enabled"] and (message.content.count("<:") + message.content.count("<a:")) > am["emojiSpam"]["maxEmojis"]:
        await apply_automod_action(am["emojiSpam"]["action"], "Emoji flood violations")
        return

    if am["wordFilter"]["enabled"] and am["wordFilter"]["words"] and any(word.lower() in msg_lower for word in am["wordFilter"]["words"]):
        await apply_automod_action(am["wordFilter"]["action"], "Using blocked language")
        return

    if am["dupMessages"]["enabled"]:
        history = _recent_messages.setdefault(author_id, [])
        history.append(msg_lower)
        del history[:-am["dupMessages"]["threshold"]]  # keep only the last `threshold` messages
        if len(history) >= am["dupMessages"]["threshold"] and len(set(history)) == 1:
            await apply_automod_action(am["dupMessages"]["action"], "Repeated duplicate messages")
            return

    if am["capsLock"]["enabled"] and len(message.content) > am["capsLock"]["minLength"]:
        uppercase_letters = sum(1 for c in message.content if c.isupper())
        total_letters = sum(1 for c in message.content if c.isalpha())
        if total_letters > 0 and (uppercase_letters / total_letters) > (am["capsLock"]["threshold"] / 100):
            await apply_automod_action(am["capsLock"]["action"], "Excessive Caps Lock usage")
            return

    # --- LEVELING: grant XP for messages that passed every automod check ---
    await handle_leveling(message)

    # Fallback: ensure any remaining prefix commands still process
    await bot.process_commands(message)


# ==========================================
#         🎭 REACTION ROLES SYSTEM
# ==========================================

async def reaction_panel_post_loop():
    """Every ~20s (right after mongo_bridge refreshes), checks each guild for
    reaction-role panels created on the dashboard that the bot hasn't posted
    to Discord yet, posts them, and writes the resulting message id back so
    they're only posted once."""
    await bot.wait_until_ready()
    while not bot.is_closed():
        if mongo_bridge.enabled():
            for guild in bot.guilds:
                for panel in mongo_bridge.get_unposted_panels(guild.id):
                    await _post_reaction_panel(guild, panel)
        await asyncio.sleep(20)


async def _post_reaction_panel(guild: discord.Guild, panel: dict):
    channel = discord.utils.get(guild.text_channels, name=panel.get("channel", ""))
    if not channel:
        return
    mappings = panel.get("mappings", [])
    if not mappings:
        return
    lines = [f"{m['emoji']} — **{m['role']}**" + (f"\n> {m['description']}" if m.get("description") else "") for m in mappings]
    embed = discord.Embed(
        title=panel.get("title", "Reaction Roles"),
        description="React below to get a role!\n\n" + "\n".join(lines),
        color=discord.Color.blurple(),
    )
    try:
        message = await channel.send(embed=embed)
        for m in mappings:
            try:
                await message.add_reaction(m["emoji"])
            except Exception:
                pass  # invalid/unavailable emoji — skip it, don't block the rest of the panel
        await mongo_bridge.mark_panel_posted(panel.get("_id"), message.id)
    except discord.Forbidden:
        pass


def _emoji_key(payload_emoji) -> str:
    # Custom emojis need their ID to match reliably; unicode emojis use the name/string directly.
    return str(payload_emoji.id) if payload_emoji.id else str(payload_emoji.name)


async def _resolve_panel_role(guild, panel, mapping):
    return discord.utils.get(guild.roles, name=mapping.get("role", ""))


@bot.event
async def on_raw_reaction_add(payload: discord.RawReactionActionEvent):
    if payload.user_id == bot.user.id or payload.guild_id is None:
        return
    guild = bot.get_guild(payload.guild_id)
    if not guild:
        return
    member = guild.get_member(payload.user_id)
    if not member:
        return

    panel = mongo_bridge.find_panel_by_message(payload.guild_id, payload.message_id) if mongo_bridge.enabled() else None
    if panel:
        mapping = mongo_bridge.find_mapping(panel, _emoji_key(payload.emoji))
        if not mapping:
            return
        role = await _resolve_panel_role(guild, panel, mapping)
        if not role:
            return
        panel_type = panel.get("type", "normal")
        try:
            if panel_type == "unique":
                # Only one role from this panel at a time — drop any other
                # mapped roles the member currently holds before adding the new one.
                other_role_names = {m["role"] for m in panel.get("mappings", []) if m["role"] != mapping["role"]}
                other_roles = [r for r in member.roles if r.name in other_role_names]
                if other_roles:
                    await member.remove_roles(*other_roles, reason="Reaction role: unique panel switch")
                await member.add_roles(role, reason=f"Reaction role panel: {panel.get('title')}")
            elif panel_type == "limit":
                panel_role_names = {m["role"] for m in panel.get("mappings", [])}
                current_count = sum(1 for r in member.roles if r.name in panel_role_names)
                max_roles = panel.get("maxRoles") or 1
                if current_count >= max_roles:
                    channel = guild.get_channel(payload.channel_id)
                    if channel:
                        try:
                            msg = await channel.fetch_message(payload.message_id)
                            await msg.remove_reaction(payload.emoji, member)
                        except Exception:
                            pass
                    return
                await member.add_roles(role, reason=f"Reaction role panel: {panel.get('title')}")
            else:  # 'normal' and 'verify' both just grant on react
                await member.add_roles(role, reason=f"Reaction role panel: {panel.get('title')}")
        except discord.Forbidden:
            pass
        return

    # Legacy fallback: messages bound via the older `!reactionrole` command.
    role_id = get_reaction_role(payload.message_id, _emoji_key(payload.emoji))
    if not role_id:
        return
    role = guild.get_role(role_id)
    if role:
        try:
            await member.add_roles(role, reason="Reaction role")
        except discord.Forbidden:
            pass

@bot.event
async def on_raw_reaction_remove(payload: discord.RawReactionActionEvent):
    if payload.guild_id is None:
        return
    guild = bot.get_guild(payload.guild_id)
    if not guild:
        return
    member = guild.get_member(payload.user_id)
    if not member:
        return

    panel = mongo_bridge.find_panel_by_message(payload.guild_id, payload.message_id) if mongo_bridge.enabled() else None
    if panel:
        # 'verify' panels are one-way: unreacting never takes the role back.
        if panel.get("type") == "verify":
            return
        mapping = mongo_bridge.find_mapping(panel, _emoji_key(payload.emoji))
        if not mapping:
            return
        role = await _resolve_panel_role(guild, panel, mapping)
        if role:
            try:
                await member.remove_roles(role, reason=f"Reaction role panel removed: {panel.get('title')}")
            except discord.Forbidden:
                pass
        return

    # Legacy fallback
    role_id = get_reaction_role(payload.message_id, _emoji_key(payload.emoji))
    if not role_id:
        return
    role = guild.get_role(role_id)
    if role:
        try:
            await member.remove_roles(role, reason="Reaction role removed")
        except discord.Forbidden:
            pass

@bot.hybrid_command(name="reactionrole", aliases=["rr"], description="Bind or remove an emoji-role reaction on a message")
@commands.has_role(REQUIRED_ROLE_ID)
@app_commands.describe(message_id="The ID of the message to bind to", emoji="The emoji to react with", role="Role to grant (omit to remove the binding)")
async def reaction_role_command(ctx, message_id: str, emoji: str, role: discord.Role = None):
    """
    Binds an emoji on a message to a role, or removes a binding.
    Usage: ?rr <message_id> <emoji> @role   -> add a binding
           ?rr <message_id> <emoji>         -> remove a binding
    """
    try:
        message_id = int(message_id)
    except ValueError:
        await ctx.send(embed=quick_embed("❌ That doesn't look like a valid message ID."))
        return

    try:
        target_message = await ctx.channel.fetch_message(message_id)
    except discord.NotFound:
        await ctx.send(embed=quick_embed("❌ Couldn't find that message in this channel. Run this command in the same channel as the message."))
        return

    custom_emoji_match = re.match(r"<a?:\w+:(\d+)>", emoji)
    key = custom_emoji_match.group(1) if custom_emoji_match else emoji

    if role is None:
        remove_reaction_role(message_id, key)
        await ctx.send(embed=quick_embed(f"✅ Removed reaction role binding for {emoji} on that message."))
        return

    add_reaction_role(ctx.guild.id, message_id, key, role.id)
    try:
        await target_message.add_reaction(emoji)
    except discord.HTTPException:
        await ctx.send(embed=quick_embed(f"⚠️ Binding saved, but I couldn't react with {emoji} myself — add it manually so people have something to click."))
        return
    await ctx.send(embed=quick_embed(f"✅ {emoji} on that message now grants {role.mention}."))


# ==========================================
#         ⚡ THE AESTHETIC MUSIC ENGINE
# ==========================================

def play_next_in_queue(ctx):
    guild_id = ctx.guild.id
    vc = ctx.voice_client
    if not vc or not vc.is_connected():
        return

    # Handle looping: re-queue the track that just finished before picking the next one
    finished_track = now_playing.get(guild_id)
    mode = loop_modes.get(guild_id, "off")
    if finished_track:
        if mode == "track":
            song_queues.setdefault(guild_id, []).insert(0, finished_track)
        elif mode == "queue":
            song_queues.setdefault(guild_id, []).append(finished_track)

    if guild_id in song_queues and len(song_queues[guild_id]) > 0:
        next_track = song_queues[guild_id].pop(0)
        now_playing[guild_id] = next_track

        ffmpeg_options = {
            'before_options': '-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5',
            'options': '-vn'
        }

        volume = song_volumes.get(guild_id, 1.0)
        source = discord.PCMVolumeTransformer(discord.FFmpegPCMAudio(next_track["url"], **ffmpeg_options), volume=volume)

        vc.play(
            source,
            after=lambda e: play_next_in_queue(ctx)
        )
        
        embed = discord.Embed(
            title="🎶 Now Playing",
            description=f"**[{next_track['title']}]({next_track['url']})** \n⏱️ Duration: `{next_track['duration']}`",
            color=0x2f3136
        )
        if next_track["thumbnail"]:
            embed.set_thumbnail(url=next_track["thumbnail"])
        embed.set_footer(text="Enjoy the stream session matrix 🔊")
        bot.loop.create_task(ctx.send(embed=embed))
    else:
        now_playing.pop(guild_id, None)
        bot.loop.create_task(ctx.send("🏁 **Queue completed.** The audio stream has finished."))

@bot.hybrid_command(name="play", description="Play or queue a song in your voice channel")
@app_commands.describe(search_or_url="Song name, search term, or a direct URL")
async def play_audio_command(ctx, *, search_or_url: str = None):
    if not ctx.author.voice:
        await ctx.send(embed=quick_embed("❌ You must join a voice channel first!"))
        return

    if search_or_url is None and ctx.message and ctx.message.attachments:
        search_or_url = ctx.message.attachments[0].url

    if not search_or_url:
        await ctx.send(embed=quick_embed("❌ Provide a track name or URL! Syntax: `?play <song title or link>`"))
        return

    vc = ctx.voice_client
    if not vc:
        vc = await ctx.author.voice.channel.connect()

    async with ctx.typing():
        info = None
        stream_url = None
        
        # Try SoundCloud search loop first to handle cloud engines safely
        try:
            with yt_dlp.YoutubeDL({'format': 'bestaudio/best', 'noplaylist': True, 'quiet': True, 'default_search': 'scsearch'}) as ydl:
                info = ydl.extract_info(search_or_url, download=False)
                if 'entries' in info and len(info['entries']) > 0:
                    info = info['entries'][0]
                elif 'entries' in info and len(info['entries']) == 0:
                    info = None
                
                if info:
                    stream_url = info['url']
        except Exception:
            info = None  

        # Fallback Strategy: If SoundCloud fails or hits DRM, automatically use alternate parsing
        if not stream_url:
            try:
                with yt_dlp.YoutubeDL({'format': 'bestaudio/best', 'noplaylist': True, 'quiet': True, 'default_search': 'ytsearch'}) as ydl:
                    info = ydl.extract_info(search_or_url, download=False)
                    if 'entries' in info:
                        info = info['entries'][0]
                    stream_url = info['url']
            except Exception as e:
                await ctx.send(embed=quick_embed(f"❌ Failed to parse media details from all engine paths: {e}"))
                return

        song_title = info.get('title', 'Unknown Track') if info else 'Unknown Track'
        thumbnail = info.get('thumbnail', None) if info else None
        duration_secs = info.get('duration', 0) if info else 0
        duration_str = str(datetime.timedelta(seconds=duration_secs))[2:7] if duration_secs else "Live Stream"

    guild_id = ctx.guild.id
    if guild_id not in song_queues:
        song_queues[guild_id] = []

    track_data = {
        "url": stream_url,
        "title": song_title,
        "duration": duration_str,
        "thumbnail": thumbnail,
        "ctx": ctx
    }

    ffmpeg_options = {
        'before_options': '-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5',
        'options': '-vn'
    }

    if vc.is_playing():
        song_queues[guild_id].append(track_data)
        position = len(song_queues[guild_id])
        
        embed = discord.Embed(
            title=f"Queued at position #{position}",
            description=f"**[{song_title}]({stream_url})**\n⏱️ Duration: `[{duration_str}]`",
            color=0x1E1F22
        )
        if thumbnail:
            embed.set_thumbnail(url=thumbnail)
        embed.set_footer(text="Not the correct track? Try being more specific.")
        await ctx.send(embed=embed)
    else:
        now_playing[guild_id] = track_data
        volume = song_volumes.get(guild_id, 1.0)
        source = discord.PCMVolumeTransformer(discord.FFmpegPCMAudio(stream_url, **ffmpeg_options), volume=volume)
        vc.play(
            source,
            after=lambda e: play_next_in_queue(ctx)
        )
        embed = discord.Embed(
            title="🎶 Now Playing",
            description=f"**[{song_title}]({stream_url})**\n⏱️ Duration: `[{duration_str}]`",
            color=0x2f3136
        )
        if thumbnail:
            embed.set_thumbnail(url=thumbnail)
        await ctx.send(embed=embed)

@bot.hybrid_command(name="skip", description="Skip the current track")
async def skip_audio_command(ctx):
    vc = ctx.voice_client
    if vc and vc.is_playing():
        vc.stop()
        await ctx.send(embed=quick_embed("⏭️ **Track skipped.** Loading next active layout..."))
    else:
        await ctx.send(embed=quick_embed("❌ No active music streaming tracks detected."))

@bot.hybrid_command(name="stop", description="Stop playback and clear the queue")
async def stop_audio_command(ctx):
    guild_id = ctx.guild.id
    if guild_id in song_queues:
        song_queues[guild_id] = []
    now_playing.pop(guild_id, None)
    loop_modes[guild_id] = "off"
    vc = ctx.voice_client
    if vc and vc.is_playing():
        vc.stop()
    await ctx.send(embed=quick_embed("⏹️ **Playback halted.** Core audio queues flushed completely."))

@bot.hybrid_command(name="leave", description="Disconnect the bot from voice")
async def leave_voice_command(ctx):
    vc = ctx.voice_client
    if vc:
        guild_id = ctx.guild.id
        song_queues.pop(guild_id, None)
        now_playing.pop(guild_id, None)
        await vc.disconnect()
        await ctx.send(embed=quick_embed("👋 **Disconnected successfully** from local voice rooms."))
    else:
        await ctx.send(embed=quick_embed("❌ I am not connected to any voice rooms."))

@bot.hybrid_command(name="queue", aliases=["q"], description="Show the current music queue")
async def queue_command(ctx):
    guild_id = ctx.guild.id
    queue = song_queues.get(guild_id, [])
    current = now_playing.get(guild_id)

    if not current and not queue:
        await ctx.send(embed=quick_embed("📭 Nothing is playing and the queue is empty."))
        return

    embed = discord.Embed(title="🎶 Music Queue", color=0x2f3136)
    if current:
        embed.add_field(
            name="▶️ Now Playing",
            value=f"**[{current['title']}]({current['url']})** — `{current['duration']}`",
            inline=False,
        )
    if queue:
        lines = [f"**{i}.** [{t['title']}]({t['url']}) — `{t['duration']}`" for i, t in enumerate(queue[:10], 1)]
        embed.add_field(name=f"⏭️ Up Next ({len(queue)})", value="\n".join(lines), inline=False)
        if len(queue) > 10:
            embed.set_footer(text=f"...and {len(queue) - 10} more track(s) queued.")
    else:
        embed.add_field(name="⏭️ Up Next", value="Queue is empty.", inline=False)
    await ctx.send(embed=embed)

@bot.hybrid_command(name="nowplaying", aliases=["np"], description="Show what's currently playing")
async def nowplaying_command(ctx):
    current = now_playing.get(ctx.guild.id)
    if not current:
        await ctx.send(embed=quick_embed("❌ Nothing is currently playing."))
        return

    embed = discord.Embed(
        title="🎶 Now Playing",
        description=f"**[{current['title']}]({current['url']})**\n⏱️ Duration: `{current['duration']}`",
        color=0x2f3136,
    )
    if current.get("thumbnail"):
        embed.set_thumbnail(url=current["thumbnail"])
    vol = int(song_volumes.get(ctx.guild.id, 1.0) * 100)
    mode = loop_modes.get(ctx.guild.id, "off")
    embed.set_footer(text=f"🔊 Volume: {vol}%  •  🔁 Loop: {mode}")
    await ctx.send(embed=embed)

@bot.hybrid_command(name="volume", aliases=["vol"], description="Get or set the playback volume")
@app_commands.describe(percent="Volume percentage (0-200)")
async def volume_command(ctx, percent: int = None):
    guild_id = ctx.guild.id
    if percent is None:
        current_vol = int(song_volumes.get(guild_id, 1.0) * 100)
        await ctx.send(embed=quick_embed(f"🔊 Current volume: **{current_vol}%**. Usage: `?volume <0-200>`"))
        return

    percent = max(0, min(200, percent))
    song_volumes[guild_id] = percent / 100

    vc = ctx.voice_client
    if vc and vc.source and isinstance(vc.source, discord.PCMVolumeTransformer):
        vc.source.volume = percent / 100

    await ctx.send(embed=quick_embed(f"🔊 Volume set to **{percent}%**."))

@bot.hybrid_command(name="loop", description="Set the loop mode (off, track, or queue)")
@app_commands.describe(mode="off, track, or queue")
async def loop_command(ctx, mode: str = None):
    guild_id = ctx.guild.id
    valid_modes = ["off", "track", "queue"]
    if mode is None or mode.lower() not in valid_modes:
        current_mode = loop_modes.get(guild_id, "off")
        await ctx.send(embed=quick_embed(f"🔁 Usage: `?loop <off|track|queue>`. Current mode: **{current_mode}**"))
        return

    loop_modes[guild_id] = mode.lower()
    await ctx.send(embed=quick_embed(f"🔁 Loop mode set to **{mode.lower()}**."))

@bot.hybrid_command(name="like", description="Save a song link to your personal playlist")
@app_commands.describe(song_url="Link to the track", title="Title to save it under")
async def like_song_command(ctx, song_url: str = None, *, title: str = "Saved Track"):
    if song_url is None and ctx.message and ctx.message.attachments:
        song_url = ctx.message.attachments[0].url

    if not song_url:
        await ctx.send(embed=quick_embed("❌ Specify a link or attach a track file to save! Syntax: `?like <url> [title]`"))
        return

    add_liked_song(ctx.author.id, title, song_url)
    await ctx.send(embed=quick_embed(f"❤️ **Track Saved!** Added **'{title}'** directly to your personal Database Playlist."))

@bot.hybrid_command(name="playlist", description="View, play, or clear your saved playlist")
@app_commands.describe(action="view, play, or clear")
async def view_or_play_playlist(ctx, action: str = "view"):
    songs = get_liked_songs(ctx.author.id)
    if not songs:
        await ctx.send(embed=quick_embed("💔 Your private Liked Playlist is empty! Log songs using `?like <url>` first."))
        return

    if action.lower() == "play":
        if not ctx.author.voice:
            await ctx.send(embed=quick_embed("❌ You must join a voice channel first!"))
            return
        vc = ctx.voice_client
        if not vc: vc = await ctx.author.voice.channel.connect()

        guild_id = ctx.guild.id
        if guild_id not in song_queues: song_queues[guild_id] = []

        for title, url in songs:
            song_queues[guild_id].append({"url": url, "title": title, "duration": "Saved Track", "thumbnail": None, "ctx": ctx})

        await ctx.send(embed=quick_embed(f"📦 Loaded **{len(songs)} tracks** out of your playlist directly into active queues!"))
        if not vc.is_playing():
            play_next_in_queue(ctx)
    elif action.lower() == "clear":
        clear_liked_songs(ctx.author.id)
        await ctx.send(embed=quick_embed("🗑️ Your Liked Playlist ledger has been wiped out completely."))
    else:
        embed = discord.Embed(title=f"❤️ {ctx.author.display_name}'s Private Playlist Ledger", color=discord.Color.magenta())
        description_text = ""
        for i, (title, url) in enumerate(songs, 1):
            description_text += f"**{i}. {title}**\n🔗 [Stream Track]({url})\n\n"
        embed.description = description_text
        await ctx.send(embed=embed)


# ==========================================
#         🔨 THE AESTHETIC BAN (?BON)
# ==========================================

class AestheticSelfBanView(discord.ui.View):
    def __init__(self, ctx: commands.Context):
        super().__init__(timeout=60)
        self.ctx = ctx

    @discord.ui.button(label="Proceed", style=discord.ButtonStyle.danger, emoji="⛓️")
    async def yes_callback(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user != self.ctx.author:
            await interaction.response.send_message(embed=quick_embed("🌌 This timeline isn't yours to change."), ephemeral=True)
            return
        embed = discord.Embed(title="🪐 SYSTEM OVERRIDE SUCCESSFUL", description=f"**{interaction.user.name}** has willingly left the server matrix.", color=0x2f3136, timestamp=datetime.datetime.now(UTC))
        embed.set_image(url="https://media.giphy.com/media/3XiQswSmruBiw/giphy.gif")
        for item in self.children: item.disabled = True
        await interaction.response.edit_message(embed=embed, view=self)

    @discord.ui.button(label="Abrupt", style=discord.ButtonStyle.secondary, emoji="🛡️")
    async def no_callback(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user != self.ctx.author:
            await interaction.response.send_message(embed=quick_embed("🌌 This timeline isn't yours to change."), ephemeral=True)
            return
        embed = discord.Embed(description="🔮 *The system stabilizer kicks in. Ban sequence retracted safely.*", color=0x2f3136)
        for item in self.children: item.disabled = True
        await interaction.response.edit_message(embed=embed, view=self)

@bot.hybrid_command(name="bon", description="Cosmetic joke removal (not a real ban)")
@commands.has_role(REQUIRED_ROLE_ID)
@app_commands.describe(member="User to (fake) ban")
async def bon_prefix(ctx, member: discord.Member = None):
    if member is None:
        await ctx.send(embed=quick_embed("❌ **Syntax Error:** Specify a user profile. Example: `?bon @user`"))
        return
    if member.id == bot.user.id:
        embed = discord.Embed(title="🛡️ SECURITY PROTOCOL ACTIVE", description="**This bot is fully secured.** System access keys are locked down.", color=0x2f3136, timestamp=datetime.datetime.now(UTC))
        embed.set_image(url="https://media.giphy.com/media/139eZBmH1HTyY8/giphy.gif")
        await ctx.send(embed=embed)
        return
    if member == ctx.author:
        embed = discord.Embed(title="👾 INITIALIZING SELF DESTRUCTION SEQUENCE", description="Are you sure you want to decouple from the core frame?", color=0x2f3136)
        embed.set_image(url="https://media.giphy.com/media/a5viI92PAFUsU/giphy.gif")
        await ctx.send(embed=embed, view=AestheticSelfBanView(ctx))
        return

    funny_messages = [
        f"🚀 **{member.name}** was strapped to a rocket and launched straight into the sun! No respawns.",
        f"💥 **{member.name}** lost a 1v1 against the Ban Hammer.",
        f"🧹 **{member.name}** was mistaken for garbage and cleanly swept out of the matrix.",
        f"🛸 **{member.name}** has been abducted by aliens."
    ]
    embed = discord.Embed(title="🔨 ADMINISTRATIVE REMOVAL EXECUTED", description=random.choice(funny_messages), color=0x2f3136, timestamp=datetime.datetime.now(UTC))
    embed.set_image(url="https://cdn.discordapp.com/attachments/1126581404164100147/1319747806143058012/united_bunnies.png")
    await ctx.send(embed=embed)


# ==========================================
#         🔨 REAL MODERATION TOOLS
# ==========================================
# Note: ?bon above is a cosmetic joke command. These are the actual
# enforcement tools (real kick/ban/timeout + manual warnings).
#
# These stay PREFIX-ONLY on purpose: /mod warn, /mod ban, /mod kick, etc.
# below already provide slash-command equivalents. Making these hybrid
# too would just create a duplicate top-level /warn next to /mod warn.

@bot.command(name="warn")
@commands.has_role(REQUIRED_ROLE_ID)
async def warn_prefix(ctx, member: discord.Member = None, *, reason: str = "No reason provided"):
    if member is None:
        await ctx.send(embed=quick_embed("❌ Syntax: `?warn @user [reason]`"))
        return
    current = update_warnings(member.id, 1)
    embed = discord.Embed(
        title="⚠️ Warning Issued",
        description=f"{member.mention} has been warned by {ctx.author.mention}.\n__**Reason:**__ {reason}\n__**Total warnings:**__ {current}/3",
        color=discord.Color.orange(),
    )
    await ctx.send(embed=embed)

    if current >= 3:
        reset_warnings(member.id)
        try:
            await member.timeout(datetime.timedelta(minutes=10), reason="Reached 3 warnings")
            await ctx.send(embed=quick_embed(f"🤫 **{member.display_name}** has been auto-timed out for 10 minutes after reaching 3 warnings."))
        except discord.Forbidden:
            await ctx.send(embed=quick_embed("⚠️ Reached 3 warnings, but I don't have permission to timeout that user."))

@bot.command(name="warnings")
async def warnings_prefix(ctx, member: discord.Member = None):
    member = member or ctx.author
    count = get_warnings(member.id)
    await ctx.send(embed=quick_embed(f"📋 **{member.display_name}** currently has **{count}/3** warnings."))

@bot.command(name="clearwarnings")
@commands.has_role(REQUIRED_ROLE_ID)
async def clearwarnings_prefix(ctx, member: discord.Member = None):
    if member is None:
        await ctx.send(embed=quick_embed("❌ Syntax: `?clearwarnings @user`"))
        return
    reset_warnings(member.id)
    await ctx.send(embed=quick_embed(f"✅ Cleared all warnings for **{member.display_name}**."))

@bot.command(name="mute")
@commands.has_role(REQUIRED_ROLE_ID)
async def mute_prefix(ctx, member: discord.Member = None, minutes: int = 10, *, reason: str = "No reason provided"):
    if member is None:
        await ctx.send(embed=quick_embed("❌ Syntax: `?mute @user [minutes] [reason]`"))
        return
    minutes = max(1, min(40320, minutes))  # Discord's timeout cap is 28 days
    try:
        await member.timeout(datetime.timedelta(minutes=minutes), reason=f"{reason} (by {ctx.author})")
    except discord.Forbidden:
        await ctx.send(embed=quick_embed("❌ I don't have permission to timeout that user (check role hierarchy)."))
        return
    embed = discord.Embed(
        title="🤫 Member Muted",
        description=f"{member.mention} has been muted for **{minutes} minute(s)**.\n__**Reason:**__ {reason}",
        color=discord.Color.orange(),
    )
    await ctx.send(embed=embed)

@bot.command(name="unmute")
@commands.has_role(REQUIRED_ROLE_ID)
async def unmute_prefix(ctx, member: discord.Member = None):
    if member is None:
        await ctx.send(embed=quick_embed("❌ Syntax: `?unmute @user`"))
        return
    try:
        await member.timeout(None, reason=f"Unmuted by {ctx.author}")
    except discord.Forbidden:
        await ctx.send(embed=quick_embed("❌ I don't have permission to unmute that user."))
        return
    await ctx.send(embed=quick_embed(f"🔊 **{member.display_name}** has been unmuted."))

@bot.command(name="kick")
@commands.has_role(REQUIRED_ROLE_ID)
async def kick_prefix(ctx, member: discord.Member = None, *, reason: str = "No reason provided"):
    if member is None:
        await ctx.send(embed=quick_embed("❌ Syntax: `?kick @user [reason]`"))
        return
    if member.top_role >= ctx.author.top_role and ctx.author.id != ctx.guild.owner_id:
        await ctx.send(embed=quick_embed("❌ You can't kick someone with an equal or higher role than you."))
        return
    try:
        await member.kick(reason=f"{reason} (by {ctx.author})")
    except discord.Forbidden:
        await ctx.send(embed=quick_embed("❌ I don't have permission to kick that user (check role hierarchy)."))
        return
    embed = discord.Embed(
        title="👢 Member Kicked",
        description=f"**{member}** was kicked.\n__**Reason:**__ {reason}",
        color=discord.Color.orange(),
    )
    await ctx.send(embed=embed)

@bot.command(name="ban")
@commands.has_role(REQUIRED_ROLE_ID)
async def ban_prefix(ctx, member: discord.Member = None, *, reason: str = "No reason provided"):
    if member is None:
        await ctx.send(embed=quick_embed("❌ Syntax: `?ban @user [reason]`"))
        return
    if member.top_role >= ctx.author.top_role and ctx.author.id != ctx.guild.owner_id:
        await ctx.send(embed=quick_embed("❌ You can't ban someone with an equal or higher role than you."))
        return
    try:
        await member.ban(reason=f"{reason} (by {ctx.author})")
    except discord.Forbidden:
        await ctx.send(embed=quick_embed("❌ I don't have permission to ban that user (check role hierarchy)."))
        return
    embed = discord.Embed(
        title="🔨 Member Banned",
        description=f"**{member}** was banned.\n__**Reason:**__ {reason}",
        color=discord.Color.red(),
    )
    await ctx.send(embed=embed)

@bot.command(name="unban")
@commands.has_role(REQUIRED_ROLE_ID)
async def unban_prefix(ctx, user_id: int = None, *, reason: str = "No reason provided"):
    if user_id is None:
        await ctx.send(embed=quick_embed("❌ Syntax: `?unban <user_id> [reason]`"))
        return
    try:
        user = await bot.fetch_user(user_id)
        await ctx.guild.unban(user, reason=f"{reason} (by {ctx.author})")
    except discord.NotFound:
        await ctx.send(embed=quick_embed("❌ That user isn't banned."))
        return
    except discord.Forbidden:
        await ctx.send(embed=quick_embed("❌ I don't have permission to unban."))
        return
    await ctx.send(embed=quick_embed(f"✅ Unbanned **{user}**."))


# ==========================================
#         📈 LEVELING SYSTEM COMMANDS
# ==========================================

def make_progress_bar(current: int, needed: int, length: int = 15) -> str:
    filled = round(length * min(current / needed, 1.0)) if needed else 0
    return "█" * filled + "░" * (length - filled)

@bot.hybrid_command(name="rank", aliases=["level"], description="Check level and XP progress")
@app_commands.describe(member="User to check (defaults to yourself)")
async def rank_prefix(ctx, member: discord.Member = None):
    member = member or ctx.author
    xp, level = get_level_data(ctx.guild.id, member.id)
    needed_for_next = xp_for_level(level + 1)
    needed_for_current = xp_for_level(level)
    progress = xp - needed_for_current
    span = needed_for_next - needed_for_current
    bar = make_progress_bar(progress, span)

    embed = discord.Embed(title=f"📈 Rank — {member.display_name}", color=discord.Color.blurple())
    embed.set_thumbnail(url=member.display_avatar.url)
    embed.add_field(name="Level", value=str(level), inline=True)
    embed.add_field(name="Total XP", value=str(xp), inline=True)
    embed.add_field(name="Progress to Next Level", value=f"`{bar}` {progress}/{span} XP", inline=False)
    await ctx.send(embed=embed)

@bot.hybrid_command(name="levelleaderboard", aliases=["levellb", "ranklb"], description="Show the top XP earners in this server")
async def level_leaderboard_prefix(ctx):
    rows = level_leaderboard(ctx.guild.id, limit=10)
    if not rows:
        await ctx.send(embed=quick_embed("No one has earned XP in this server yet."))
        return
    lines = []
    for i, (user_id, xp, level) in enumerate(rows, start=1):
        member = ctx.guild.get_member(user_id)
        name = member.mention if member else f"<@{user_id}>"
        lines.append(f"**{i}.** {name} — Level {level} ({xp} XP)")
    embed = discord.Embed(title="📈 Level Leaderboard", description="\n".join(lines), color=discord.Color.blurple())
    await ctx.send(embed=embed)


# ==========================================
#         📊 PRIVATE GLOBAL DASHBOARD
# ==========================================

class DashboardLinks(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)
        self.add_item(discord.ui.Button(label="Invite Bot", emoji="🤖", style=discord.ButtonStyle.link, url=INVITE_URL))
        self.add_item(discord.ui.Button(label="Support Server", emoji="🛟", style=discord.ButtonStyle.link, url=SUPPORT_SERVER_URL))
        self.add_item(discord.ui.Button(label="Dashboard", emoji="📊", style=discord.ButtonStyle.link, url=DASHBOARD_URL))

@bot.tree.command(name="dashboard", description="📊 View the server dashboard privately.")
@has_required_slash_role()
async def dashboard_slash(interaction: discord.Interaction):
    embed = discord.Embed(
        title="📊 Server: UNITED BUNNIES",
        description="__**Commands start with `?`**__\nManage everything below from the web dashboard, or jump into support if you need a hand.",
        color=BRAND_COLOR,
        timestamp=datetime.datetime.now(UTC),
    )
    embed.add_field(name="ℹ️ Help & Support", value=f"• [Support Server]({SUPPORT_SERVER_URL})\n• [Web Dashboard]({DASHBOARD_URL})", inline=True)
    await interaction.response.send_message(embed=embed, view=DashboardLinks(), ephemeral=True)


# ==========================================
#      📢 AESTHETIC TEXT & IMAGE ?P COMMAND
# ==========================================

@bot.hybrid_command(name="p", description="[Staff] Post a custom formatted announcement embed")
@commands.has_role(REQUIRED_ROLE_ID)
@app_commands.describe(text="Announcement text. Use [IMAGE] <url>, [SECTION] or [FIELD] to structure it")
async def p_prefix(ctx, *, text: str):
    try:
        if ctx.message:
            await ctx.message.delete()
    except Exception: pass

    image_urls = re.findall(r'\[IMAGE\]\s*([^\s]+)', text)
    cleaned_text = re.sub(r'\[IMAGE\]\s*[^\s]+', '', text).strip()

    if not image_urls:
        image_urls = ["https://cdn.discordapp.com/attachments/1126581404164100147/1319747806143058012/united_bunnies.png"]

    embeds = []
    if "[SECTION]" in cleaned_text:
        parts = cleaned_text.split("[SECTION]")
        main_desc = parts[0].strip()
        main_embed = discord.Embed(title="🐰 ── 𝐔𝐍𝐈𝐓𝐄𝐃 𝐁𝐔𝐍𝐍𝐈𝐄𝐒 ── 🐰", description=main_desc, color=0x2f3136, timestamp=datetime.datetime.now(UTC))
        for part in parts[1:]:
            part = part.strip()
            if not part: continue
            lines = part.split("\n", 1)
            main_embed.add_field(name=f"🐰 ─── {lines[0].strip().upper()} ─── 🐰", value=lines[1].strip() if len(lines) > 1 else "...", inline=False)
    else:
        parts = cleaned_text.split("[FIELD]")
        main_desc = parts[0].strip()
        main_embed = discord.Embed(title="🐰 ── 𝐔𝐍𝐈𝐓𝐄𝐃 𝐁𝐔𝐍𝐍𝐈𝐄𝐒 ── 🐰", description=main_desc, color=0x2f3136, timestamp=datetime.datetime.now(UTC))
        for part in parts[1:]:
            part = part.strip()
            if not part: continue
            lines = part.split('\n', 1)
            main_embed.add_field(name=lines[0].strip(), value=lines[1].strip() if len(lines) > 1 else "...", inline=False)

    main_embed.set_footer(text="🐰 Matrix System Active 🌟")
    main_embed.set_image(url=image_urls[0])
    embeds.append(main_embed)

    for extra_url in image_urls[1:4]:
        extra_embed = discord.Embed(color=0x2f3136)
        extra_embed.set_image(url=extra_url)
        embeds.append(extra_embed)

    await ctx.send(embeds=embeds)


# ==========================================
#         🎫 TICKET SYSTEM
# ==========================================

TICKET_TYPES = {
    "general": ("🎫", "General Support"),
    "report": ("🚨", "Report a Member"),
    "billing": ("💳", "Billing / Payment"),
    "bug": ("🐛", "Bug Report"),
    "other": ("❔", "Other"),
}

async def get_or_create_ticket_category(guild: discord.Guild) -> discord.CategoryChannel:
    category = discord.utils.get(guild.categories, name=TICKET_CATEGORY_NAME)
    if category is None:
        category = await guild.create_category(TICKET_CATEGORY_NAME)
    return category

async def open_new_ticket(guild: discord.Guild, user: discord.Member, ticket_type_key: str = "general") -> discord.TextChannel:
    emoji, type_label = TICKET_TYPES.get(ticket_type_key, TICKET_TYPES["general"])
    category = await get_or_create_ticket_category(guild)
    staff_role = guild.get_role(REQUIRED_ROLE_ID)

    overwrites = {
        guild.default_role: discord.PermissionOverwrite(view_channel=False),
        user: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True),
        guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True, manage_channels=True),
    }
    if staff_role:
        overwrites[staff_role] = discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True)

    safe_name = re.sub(r"[^a-z0-9]+", "-", user.name.lower()).strip("-") or "user"
    channel = await guild.create_text_channel(
        name=f"ticket-{safe_name}",
        category=category,
        overwrites=overwrites,
        topic=f"{type_label} | Opened by {user} ({user.id})",
        reason=f"Ticket opened by {user}",
    )
    create_ticket_record(channel.id, guild.id, user.id, type_label)

    embed = discord.Embed(
        title=f"{emoji} Ticket Opened — {type_label}",
        description=(
            f"Welcome {user.mention}! A staff member will be with you shortly.\n\n"
            f"Describe your issue below. Staff can **Claim** this ticket to take ownership, "
            f"and either side can **Close** it when resolved."
        ),
        color=0x2f3136,
        timestamp=datetime.datetime.now(UTC),
    )
    embed.set_footer(text=f"Ticket type: {type_label}")
    await channel.send(content=f"{user.mention}", embed=embed, view=TicketManageView())
    return channel

class TicketTypeSelect(discord.ui.Select):
    def __init__(self):
        options = [
            discord.SelectOption(label=label, emoji=emoji, value=key)
            for key, (emoji, label) in TICKET_TYPES.items()
        ]
        super().__init__(placeholder="What do you need help with?", min_values=1, max_values=1, options=options)

    async def callback(self, interaction: discord.Interaction):
        existing = get_open_ticket_for_user(interaction.guild.id, interaction.user.id)
        if existing:
            channel = interaction.guild.get_channel(existing)
            if channel:
                await interaction.response.edit_message(content=f"❗ You already have an open ticket: {channel.mention}", view=None)
                return
        await interaction.response.edit_message(content="🎫 Creating your ticket...", view=None)
        channel = await open_new_ticket(interaction.guild, interaction.user, self.values[0])
        await interaction.followup.send(f"✅ Ticket created: {channel.mention}", ephemeral=True)

class TicketTypeSelectView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=120)
        self.add_item(TicketTypeSelect())

class TicketManageView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Claim", style=discord.ButtonStyle.primary, emoji="🙋", custom_id="ticket_claim_button")
    async def claim_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        staff_role = interaction.guild.get_role(REQUIRED_ROLE_ID)
        is_staff = staff_role and staff_role in interaction.user.roles
        if not is_staff:
            await interaction.response.send_message(embed=quick_embed("❌ Only staff can claim tickets."), ephemeral=True)
            return

        record = get_ticket_record(interaction.channel.id)
        if not record:
            await interaction.response.send_message(embed=quick_embed("❌ This isn't a ticket channel."), ephemeral=True)
            return
        _, status, _, claimed_by = record

        if claimed_by == interaction.user.id:
            unclaim_ticket_record(interaction.channel.id)
            button.label = "Claim"
            button.style = discord.ButtonStyle.primary
            await interaction.response.edit_message(view=self)
            await interaction.followup.send(f"↩️ {interaction.user.mention} unclaimed this ticket.")
            return

        if claimed_by:
            await interaction.response.send_message(embed=quick_embed(f"❗ This ticket is already claimed by <@{claimed_by}>."), ephemeral=True)
            return

        claim_ticket_record(interaction.channel.id, interaction.user.id)
        button.label = f"Claimed by {interaction.user.display_name}"
        button.style = discord.ButtonStyle.secondary
        await interaction.response.edit_message(view=self)
        await interaction.followup.send(f"🙋 {interaction.user.mention} claimed this ticket and will be assisting you.")

    @discord.ui.button(label="Add Member", style=discord.ButtonStyle.secondary, emoji="➕", custom_id="ticket_add_member_button")
    async def add_member_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        staff_role = interaction.guild.get_role(REQUIRED_ROLE_ID)
        is_staff = staff_role and staff_role in interaction.user.roles
        if not is_staff:
            await interaction.response.send_message(embed=quick_embed("❌ Only staff can add members to a ticket."), ephemeral=True)
            return
        await interaction.response.send_message(
            "➕ Mention the member to add, e.g. `@username` (paste it as your next message here — staff only).",
            ephemeral=True,
        )

    @discord.ui.button(label="Close Ticket", style=discord.ButtonStyle.danger, emoji="🔒", custom_id="ticket_close_button")
    async def close_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        staff_role = interaction.guild.get_role(REQUIRED_ROLE_ID)
        is_staff = staff_role and staff_role in interaction.user.roles
        record = get_ticket_record(interaction.channel.id)
        is_owner = record and record[0] == interaction.user.id

        if not (is_staff or is_owner):
            await interaction.response.send_message(embed=quick_embed("❌ Only the ticket opener or staff can close this ticket."), ephemeral=True)
            return

        close_ticket_record(interaction.channel.id)
        await interaction.response.send_message(embed=quick_embed("🔒 **Closing this ticket in 5 seconds...**"))
        await asyncio.sleep(5)
        try:
            await interaction.channel.delete(reason=f"Ticket closed by {interaction.user}")
        except discord.NotFound:
            pass

class TicketPanelView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Create Ticket", style=discord.ButtonStyle.primary, emoji="🎫", custom_id="ticket_create_button")
    async def create_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        existing = get_open_ticket_for_user(interaction.guild.id, interaction.user.id)
        if existing:
            channel = interaction.guild.get_channel(existing)
            if channel:
                await interaction.response.send_message(embed=quick_embed(f"❗ You already have an open ticket: {channel.mention}"), ephemeral=True)
                return
        await interaction.response.send_message(embed=quick_embed("🎫 What do you need help with?"), view=TicketTypeSelectView(), ephemeral=True)

@bot.hybrid_command(name="ticketpanel", description="[Staff] Post a button-based ticket-creation panel")
@commands.has_role(REQUIRED_ROLE_ID)
async def ticket_panel_prefix(ctx):
    embed = discord.Embed(
        title="🎫 Support Tickets",
        description="Need help? Click the button below to open a private ticket with staff.",
        color=0x2f3136,
    )
    await ctx.send(embed=embed, view=TicketPanelView())

@bot.hybrid_command(name="ticket", description="Open a private support ticket")
async def ticket_prefix(ctx):
    existing = get_open_ticket_for_user(ctx.guild.id, ctx.author.id)
    if existing:
        channel = ctx.guild.get_channel(existing)
        if channel:
            await ctx.send(embed=quick_embed(f"❗ You already have an open ticket: {channel.mention}"))
            return
    await ctx.send(embed=quick_embed("🎫 What do you need help with?"), view=TicketTypeSelectView())

@bot.hybrid_command(name="closeticket", description="Close the ticket you're currently in")
async def close_ticket_prefix(ctx):
    record = get_ticket_record(ctx.channel.id)
    if not record:
        await ctx.send(embed=quick_embed("❌ This isn't a ticket channel."))
        return

    staff_role = ctx.guild.get_role(REQUIRED_ROLE_ID)
    is_staff = staff_role and staff_role in ctx.author.roles
    is_owner = record[0] == ctx.author.id
    if not (is_staff or is_owner):
        await ctx.send(embed=quick_embed("❌ Only the ticket opener or staff can close this ticket."))
        return

    close_ticket_record(ctx.channel.id)
    await ctx.send(embed=quick_embed("🔒 **Closing this ticket in 5 seconds...**"))
    await asyncio.sleep(5)
    try:
        await ctx.channel.delete(reason=f"Ticket closed by {ctx.author}")
    except discord.NotFound:
        pass

@bot.hybrid_command(name="tickets", description="[Staff] List all currently open tickets")
@commands.has_role(REQUIRED_ROLE_ID)
async def list_tickets_prefix(ctx):
    rows = list_open_tickets(ctx.guild.id)
    if not rows:
        await ctx.send(embed=quick_embed("📭 No open tickets right now."))
        return
    lines = []
    for channel_id, user_id, ticket_type, claimed_by, created_at in rows:
        channel = ctx.guild.get_channel(channel_id)
        chan_text = channel.mention if channel else f"`#deleted-{channel_id}`"
        claim_text = f"claimed by <@{claimed_by}>" if claimed_by else "unclaimed"
        lines.append(f"{chan_text} — <@{user_id}> — *{ticket_type}* — {claim_text}")
    embed = discord.Embed(title=f"🎫 Open Tickets ({len(rows)})", description="\n".join(lines), color=0x2f3136)
    await ctx.send(embed=embed)


# ==========================================
#         💍 MARRIAGE SYSTEM
# ==========================================

class MarriageProposalView(discord.ui.View):
    def __init__(self, proposer: discord.Member, target: discord.Member):
        super().__init__(timeout=60)
        self.proposer = proposer
        self.target = target
        self.responded = False
        self.message = None  # set by the command after sending

    async def on_timeout(self):
        if self.responded or not self.message:
            return
        for item in self.children:
            item.disabled = True
        embed = discord.Embed(
            description=f"⏳ {self.target.mention} never responded — the proposal from {self.proposer.mention} expired.",
            color=discord.Color.dark_grey(),
        )
        try:
            await self.message.edit(embed=embed, view=self)
        except discord.HTTPException:
            pass

    @discord.ui.button(label="Accept 💍", style=discord.ButtonStyle.success)
    async def accept_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.target.id:
            await interaction.response.send_message(embed=quick_embed("❌ This proposal isn't addressed to you."), ephemeral=True)
            return
        if self.responded:
            return
        self.responded = True

        # Re-check at accept time in case either party got married elsewhere while this was pending
        if get_marriage(interaction.guild.id, self.proposer.id) or get_marriage(interaction.guild.id, self.target.id):
            for item in self.children:
                item.disabled = True
            embed = discord.Embed(
                description="❌ This proposal fell through — one of you is already married to someone else now.",
                color=discord.Color.red(),
            )
            await interaction.response.edit_message(embed=embed, view=self)
            return

        create_marriage(interaction.guild.id, self.proposer.id, self.target.id)
        for item in self.children:
            item.disabled = True
        embed = discord.Embed(
            title="💍 Just Married!",
            description=f"{self.proposer.mention} 💕 {self.target.mention}\n\nCongratulations to the happy couple!",
            color=discord.Color.pink(),
        )
        embed.set_footer(text="Use ?family to check on your marriage, or ?divorce if it doesn't work out.")
        await interaction.response.edit_message(embed=embed, view=self)
        async with interaction.channel.typing():
            await send_gif_embed(interaction.channel, "wedding celebration", title=None)

    @discord.ui.button(label="Decline 💔", style=discord.ButtonStyle.danger)
    async def decline_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.target.id:
            await interaction.response.send_message(embed=quick_embed("❌ This proposal isn't addressed to you."), ephemeral=True)
            return
        if self.responded:
            return
        self.responded = True
        for item in self.children:
            item.disabled = True
        embed = discord.Embed(
            description=f"💔 {self.target.mention} declined {self.proposer.mention}'s proposal.",
            color=discord.Color.red(),
        )
        await interaction.response.edit_message(embed=embed, view=self)


class DivorceConfirmView(discord.ui.View):
    def __init__(self, initiator: discord.Member, partner: discord.Member, marriage_id: int):
        super().__init__(timeout=60)
        self.initiator = initiator
        self.partner = partner
        self.marriage_id = marriage_id
        self.responded = False
        self.message = None

    async def on_timeout(self):
        if self.responded or not self.message:
            return
        for item in self.children:
            item.disabled = True
        embed = discord.Embed(
            description=f"⏳ {self.partner.mention} never responded — the divorce request expired. Still married 💍",
            color=discord.Color.dark_grey(),
        )
        try:
            await self.message.edit(embed=embed, view=self)
        except discord.HTTPException:
            pass

    @discord.ui.button(label="Confirm Divorce 💔", style=discord.ButtonStyle.danger)
    async def confirm_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.partner.id:
            await interaction.response.send_message(embed=quick_embed("❌ Only your partner can confirm this."), ephemeral=True)
            return
        if self.responded:
            return
        self.responded = True
        delete_marriage(self.marriage_id)
        for item in self.children:
            item.disabled = True
        embed = discord.Embed(
            title="💔 Divorced",
            description=f"{self.initiator.mention} and {self.partner.mention} are no longer married.",
            color=discord.Color.dark_grey(),
        )
        await interaction.response.edit_message(embed=embed, view=self)

    @discord.ui.button(label="Deny", style=discord.ButtonStyle.secondary)
    async def deny_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.partner.id:
            await interaction.response.send_message(embed=quick_embed("❌ Only your partner can respond to this."), ephemeral=True)
            return
        if self.responded:
            return
        self.responded = True
        for item in self.children:
            item.disabled = True
        embed = discord.Embed(
            description=f"{self.partner.mention} denied the divorce request. Still married 💍",
            color=discord.Color.green(),
        )
        await interaction.response.edit_message(embed=embed, view=self)


@bot.hybrid_command(name="marry", description="Propose marriage to someone")
@commands.guild_only()
@app_commands.describe(member="Who you want to propose to")
async def marry_prefix(ctx, member: discord.Member = None):
    if member is None:
        await ctx.send(embed=quick_embed("❌ Syntax: `?marry @user`"))
        return
    if member.id == ctx.author.id:
        await ctx.send(embed=quick_embed("❌ You can't marry yourself."))
        return
    if member.bot:
        await ctx.send(embed=quick_embed("❌ You can't marry a bot."))
        return

    if get_marriage(ctx.guild.id, ctx.author.id):
        await ctx.send(embed=quick_embed("❌ You're already married! Use `?divorce` first if you want to remarry."))
        return

    if get_marriage(ctx.guild.id, member.id):
        embed = discord.Embed(
            description=f"💍 **{member.display_name}** is already married! Better luck next time.",
            color=discord.Color.red(),
        )
        await ctx.send(embed=embed)
        async with ctx.typing():
            await send_gif_embed(ctx.channel, "already married objection", title=None)
        return

    embed = discord.Embed(
        title="💍 Marriage Proposal",
        description=f"{ctx.author.mention} has proposed to {member.mention}!\n\n{member.mention}, do you accept?",
        color=discord.Color.pink(),
    )
    view = MarriageProposalView(ctx.author, member)
    msg = await ctx.send(content=member.mention, embed=embed, view=view)
    view.message = msg


@bot.hybrid_command(name="divorce", description="End your marriage")
@commands.guild_only()
async def divorce_prefix(ctx):
    marriage = get_marriage(ctx.guild.id, ctx.author.id)
    if not marriage:
        await ctx.send(embed=quick_embed("❌ You're not married to anyone."))
        return

    marriage_id, user1_id, user2_id, married_at = marriage
    partner_id = user2_id if user1_id == ctx.author.id else user1_id
    partner = ctx.guild.get_member(partner_id)

    if not partner:
        # Partner has left the server — nothing to confirm with, so dissolve it automatically.
        delete_marriage(marriage_id)
        await ctx.send(embed=quick_embed("✅ Your partner is no longer in this server — the marriage has been dissolved automatically."))
        return

    embed = discord.Embed(
        title="💔 Divorce Request",
        description=f"{ctx.author.mention} wants to divorce {partner.mention}.\n\n{partner.mention}, do you confirm?",
        color=discord.Color.orange(),
    )
    view = DivorceConfirmView(ctx.author, partner, marriage_id)
    msg = await ctx.send(content=partner.mention, embed=embed, view=view)
    view.message = msg


@bot.hybrid_command(name="family", aliases=["marriage", "spouse"], description="Check someone's marriage status")
@commands.guild_only()
@app_commands.describe(member="User to check (defaults to yourself)")
async def family_prefix(ctx, member: discord.Member = None):
    member = member or ctx.author
    marriage = get_marriage(ctx.guild.id, member.id)

    if not marriage:
        if member.id == ctx.author.id:
            await ctx.send(embed=quick_embed("💔 You're not married yet. Use `?marry @user` to propose!"))
        else:
            await ctx.send(embed=quick_embed(f"💔 **{member.display_name}** isn't married yet."))
        return

    marriage_id, user1_id, user2_id, married_at = marriage
    partner_id = user2_id if user1_id == member.id else user1_id
    partner = ctx.guild.get_member(partner_id)
    partner_name = partner.mention if partner else f"<@{partner_id}>"

    try:
        married_dt = datetime.datetime.fromisoformat(married_at)
        since_text = discord.utils.format_dt(married_dt, style="R")
    except Exception:
        since_text = "some time ago"

    embed = discord.Embed(
        title=f"👪 {member.display_name}'s Family",
        description=f"💍 Married to {partner_name}\n📅 Since {since_text}",
        color=discord.Color.magenta(),
    )
    embed.set_thumbnail(url=member.display_avatar.url)
    await ctx.send(embed=embed)


# ==========================================
#         🕹️ INTERACTIVE CONTROL PANEL
# ==========================================
# A single persistent embed with buttons that ties together tickets,
# vouching, server info, and music into one place — so members don't
# need to remember every command.

class VouchModal(discord.ui.Modal, title="Vouch for a Member"):
    user_input = discord.ui.TextInput(
        label="User ID or @mention",
        placeholder="e.g. 123456789012345678 or paste their mention",
        required=True,
    )
    comment_input = discord.ui.TextInput(
        label="Comment (optional)",
        placeholder="What was it for?",
        required=False,
        style=discord.TextStyle.paragraph,
        max_length=300,
    )

    async def on_submit(self, interaction: discord.Interaction):
        raw = self.user_input.value.strip()
        match = re.search(r"\d{15,25}", raw)
        if not match:
            await interaction.response.send_message(embed=quick_embed("❌ Couldn't find a valid user ID or mention in that."), ephemeral=True)
            return

        target_id = int(match.group())
        target = interaction.guild.get_member(target_id)
        if target is None:
            await interaction.response.send_message(embed=quick_embed("❌ Couldn't find that member in this server."), ephemeral=True)
            return
        if target.id == interaction.user.id:
            await interaction.response.send_message(embed=quick_embed("❌ You can't vouch for yourself."), ephemeral=True)
            return
        if target.bot:
            await interaction.response.send_message(embed=quick_embed("❌ You can't vouch for a bot."), ephemeral=True)
            return

        comment = self.comment_input.value.strip() or None
        add_vouch(interaction.guild.id, target.id, interaction.user.id, comment)
        total = count_vouches(interaction.guild.id, target.id)

        embed = discord.Embed(
            description=f"✅ {interaction.user.mention} vouched for {target.mention}",
            color=discord.Color.green(),
        )
        if comment:
            embed.add_field(name="Comment", value=comment, inline=False)
        embed.set_footer(text=f"{target.display_name} now has {total} vouch(es)")
        await interaction.response.send_message(embed=embed)


# ==========================================
#   📝 APPLICATION SYSTEM
# ==========================================

class ApplicationModal(discord.ui.Modal, title="Application Form"):
    def __init__(self, form_data: dict):
        super().__init__(title=form_data.get("name", "Application"))
        self.form_data = form_data
        self.answers: list[dict] = []

        # Create TextInput fields for each question
        for q in sorted(form_data.get("questions", []), key=lambda x: x.get("order", 0)):
            q_type = q.get("type", "short_text")
            required = q.get("required", True)

            if q_type == "short_text":
                input_field = discord.ui.TextInput(
                    label=q.get("title", "Question"),
                    placeholder=q.get("description", "") or None,
                    required=required,
                    max_length=1000,
                    custom_id=q.get("id"),
                )
            elif q_type == "paragraph":
                input_field = discord.ui.TextInput(
                    label=q.get("title", "Question"),
                    placeholder=q.get("description", "") or None,
                    required=required,
                    style=discord.TextStyle.paragraph,
                    max_length=2000,
                    custom_id=q.get("id"),
                )
            elif q_type == "yes_no":
                # For yes/no, we use a short text that accepts yes/no
                input_field = discord.ui.TextInput(
                    label=q.get("title", "Question"),
                    placeholder="Yes or No",
                    required=required,
                    max_length=10,
                    custom_id=q.get("id"),
                )
            else:
                # Default to short_text
                input_field = discord.ui.TextInput(
                    label=q.get("title", "Question"),
                    placeholder=q.get("description", "") or None,
                    required=required,
                    max_length=1000,
                    custom_id=q.get("id"),
                )

            setattr(self, f"question_{q.get('id', 'default')}", input_field)
            self.add_item(input_field)

    async def on_submit(self, interaction: discord.Interaction):
        # Collect answers
        for q in self.form_data.get("questions", []):
            q_id = q.get("id", "default")
            try:
                answer_value = getattr(self, f"question_{q_id}", None)
                if answer_value:
                    self.answers.append({
                        "questionId": q_id,
                        "value": str(answer_value.value),
                    })
            except AttributeError:
                pass

        # Submit to dashboard API
        headers = {"x-bot-secret": BOT_API_SECRET} if BOT_API_SECRET else {}
        payload = {
            "formId": str(self.form_data.get("_id", "")),
            "applicant": {
                "discordUserId": str(interaction.user.id),
                "username": interaction.user.name,
                "globalName": interaction.user.global_name,
                "avatar": str(interaction.user.avatar.key) if interaction.user.avatar else None,
            },
            "answers": self.answers,
        }

        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
                api_url = DASHBOARD_URL.rstrip("/") + "/api/v1/guilds/" + str(interaction.guild.id) + "/applications/submissions"
                async with session.post(api_url, json=payload, headers=headers) as resp:
                    if resp.status == 201:
                        embed = discord.Embed(
                            description="✅ Your application has been submitted successfully!",
                            color=discord.Color.green(),
                        )
                        await interaction.response.send_message(embed=embed, ephemeral=True)
                    else:
                        error_text = await resp.text()
                        embed = discord.Embed(
                            description=f"❌ Failed to submit application: {resp.status}",
                            color=discord.Color.red(),
                        )
                        await interaction.response.send_message(embed=embed, ephemeral=True)
        except Exception as e:
            embed = discord.Embed(
                description=f"❌ Error submitting application: {e}",
                color=discord.Color.red(),
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)

    async def on_error(self, interaction: discord.Interaction, error: Exception):
        embed = discord.Embed(
            description=f"❌ An error occurred while submitting your application: {error}",
            color=discord.Color.red(),
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)


class ApplicationPanelView(discord.ui.View):
    def __init__(self, form_data: dict):
        super().__init__(timeout=None)
        self.form_data = form_data

        button_config = form_data.get("button", {})
        button_style_map = {
            "primary": discord.ButtonStyle.primary,
            "secondary": discord.ButtonStyle.secondary,
            "success": discord.ButtonStyle.success,
            "danger": discord.ButtonStyle.danger,
        }

        self.add_item(
            discord.ui.Button(
                label=button_config.get("label", "Apply Now"),
                style=button_style_map.get(button_config.get("style", "primary"), discord.ButtonStyle.primary),
                emoji=button_config.get("emoji"),
                custom_id=f"app_apply_{form_data.get('_id', '')}",
            )
        )

    @discord.ui.button(label="Apply", style=discord.ButtonStyle.blurple, custom_id="app_apply_placeholder", row=0)
    async def apply_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        # This is handled by the dynamic button above; this is just a placeholder
        pass


class ApplicationReviewView(discord.ui.View):
    def __init__(self, submission_id: str, form_id: str):
        super().__init__(timeout=None)
        self.submission_id = submission_id
        self.form_id = form_id

    @discord.ui.button(label="Accept", style=discord.ButtonStyle.success, emoji="✅", custom_id="app_accept", row=0)
    async def accept_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        headers = {"x-bot-secret": BOT_API_SECRET} if BOT_API_SECRET else {}
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
                api_url = DASHBOARD_URL.rstrip("/") + "/api/v1/guilds/" + str(interaction.guild.id) + "/applications/submissions/" + self.submission_id + "/status"
                async with session.patch(api_url, json={"status": "accepted"}, headers=headers) as resp:
                    if resp.status == 200:
                        await interaction.response.send_message(embed=quick_embed("✅ Application marked as accepted."), ephemeral=True)
                    else:
                        await interaction.response.send_message(embed=quick_embed(f"❌ Failed to update status: {resp.status}"), ephemeral=True)
        except Exception as e:
            await interaction.response.send_message(embed=quick_embed(f"❌ Error: {e}"), ephemeral=True)

    @discord.ui.button(label="Reject", style=discord.ButtonStyle.danger, emoji="❌", custom_id="app_reject", row=0)
    async def reject_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        headers = {"x-bot-secret": BOT_API_SECRET} if BOT_API_SECRET else {}
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
                api_url = DASHBOARD_URL.rstrip("/") + "/api/v1/guilds/" + str(interaction.guild.id) + "/applications/submissions/" + self.submission_id + "/status"
                async with session.patch(api_url, json={"status": "rejected"}, headers=headers) as resp:
                    if resp.status == 200:
                        await interaction.response.send_message(embed=quick_embed("❌ Application marked as rejected."), ephemeral=True)
                    else:
                        await interaction.response.send_message(embed=quick_embed(f"❌ Failed to update status: {resp.status}"), ephemeral=True)
        except Exception as e:
            await interaction.response.send_message(embed=quick_embed(f"❌ Error: {e}"), ephemeral=True)


@bot.tree.command(name="deploy-application", description="📝 [Mod] Deploy an application form panel to a channel.")
@has_required_slash_role()
@app_commands.describe(form_id="The ID of the application form to deploy", channel="The channel to post the panel in")
async def deploy_application_slash(interaction: discord.Interaction, form_id: str, channel: discord.TextChannel):
    # Find the application form
    form_data = mongo_bridge.find_application_form_by_id(interaction.guild.id, form_id)
    if not form_data:
        await interaction.response.send_message(embed=quick_embed(f"❌ Application form not found."), ephemeral=True)
        return

    # Build the embed from form config
    embed_config = form_data.get("embed", {})
    embed = discord.Embed(
        title=embed_config.get("title") or form_data.get("name", "Application"),
        description=embed_config.get("description") or form_data.get("description", ""),
        color=int(embed_config.get("color", "5865F2").lstrip("#"), 16) if embed_config.get("color") else discord.Color.blurple(),
    )
    if embed_config.get("footer"):
        embed.set_footer(text=embed_config["footer"])

    # Create the view with the apply button
    view = ApplicationPanelView(form_data)

    # Send the panel message
    msg = await channel.send(embed=embed, view=view)

    # Mark the form as deployed in MongoDB
    await mongo_bridge.mark_application_form_deployed(form_id, msg.id)

    embed_success = discord.Embed(
        description=f"✅ Application panel deployed to {channel.mention}",
        color=discord.Color.green(),
    )
    embed_success.add_field(name="Message ID", value=str(msg.id), inline=False)
    await interaction.response.send_message(embed=embed_success, ephemeral=True)


@bot.tree.command(name="application-forms", description="📝 List all application forms for this server.")
@has_required_slash_role()
async def application_forms_slash(interaction: discord.Interaction):
    forms = mongo_bridge.get_application_forms(interaction.guild.id)
    if not forms:
        await interaction.response.send_message(embed=quick_embed("📋 No application forms configured yet."), ephemeral=True)
        return

    lines = []
    for form in forms[:10]:
        status_emoji = {"draft": "📝", "active": "✅", "archived": "🗄️"}.get(form.get("status", "draft"), "📝")
        deployed = "✅" if form.get("messageId") else "❌"
        lines.append(f"{status_emoji} **{form.get('name', 'Unnamed')}** — Deployed: {deployed}")

    embed = discord.Embed(title="📝 Application Forms", description="\n".join(lines), color=discord.Color.blurple())
    if len(forms) > 10:
        embed.set_footer(text=f"...and {len(forms) - 10} more.")
    await interaction.response.send_message(embed=embed, ephemeral=True)


@bot.event
async def on_interaction(interaction: discord.Interaction):
    # Handle application form button clicks
    if interaction.type == discord.InteractionType.component and interaction.data.get("custom_id", "").startswith("app_apply_"):
        form_id = interaction.data["custom_id"].replace("app_apply_", "", 1)
        form_data = mongo_bridge.find_application_form_by_id(interaction.guild.id, form_id)
        if not form_data:
            await interaction.response.send_message(embed=quick_embed("❌ This application form no longer exists."), ephemeral=True)
            return

        if form_data.get("status") != "active":
            await interaction.response.send_message(embed=quick_embed("❌ This application form is not currently accepting submissions."), ephemeral=True)
            return

        # Check if user already has a pending submission
        headers = {"x-bot-secret": BOT_API_SECRET} if BOT_API_SECRET else {}
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
                api_url = DASHBOARD_URL.rstrip("/") + "/api/v1/guilds/" + str(interaction.guild.id) + "/applications/submissions?formId=" + form_id
                async with session.get(api_url, headers=headers) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        submissions = data.get("submissions", [])
                        for sub in submissions:
                            if sub.get("applicant", {}).get("discordUserId") == str(interaction.user.id):
                                if sub.get("status") in ["pending", "reviewing"]:
                                    await interaction.response.send_message(
                                        embed=quick_embed("❗ You already have a pending application for this form."),
                                        ephemeral=True,
                                    )
                                    return
        except Exception:
            pass  # Continue even if we can't check

        modal = ApplicationModal(form_data)
        await interaction.response.send_modal(modal)
        return

    # Continue with default interaction handling
    pass


class ControlPanelView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Open Ticket", style=discord.ButtonStyle.primary, emoji="🎫", custom_id="panel_open_ticket", row=0)
    async def ticket_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        existing = get_open_ticket_for_user(interaction.guild.id, interaction.user.id)
        if existing:
            channel = interaction.guild.get_channel(existing)
            if channel:
                await interaction.response.send_message(embed=quick_embed(f"❗ You already have an open ticket: {channel.mention}"), ephemeral=True)
                return
        await interaction.response.send_message(embed=quick_embed("🎫 Creating your ticket..."), ephemeral=True)
        channel = await open_new_ticket(interaction.guild, interaction.user)
        await interaction.followup.send(f"✅ Ticket created: {channel.mention}", ephemeral=True)

    @discord.ui.button(label="Vouch Someone", style=discord.ButtonStyle.success, emoji="✅", custom_id="panel_vouch", row=0)
    async def vouch_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_modal(VouchModal())

    @discord.ui.button(label="Server Info", style=discord.ButtonStyle.secondary, emoji="📊", custom_id="panel_serverinfo", row=0)
    async def serverinfo_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        g = interaction.guild
        embed = discord.Embed(title=f"Server Info: {g.name}", color=0x2f3136, timestamp=datetime.datetime.now(UTC))
        if g.icon:
            embed.set_thumbnail(url=g.icon.url)
        embed.add_field(name="ID", value=str(g.id), inline=True)
        embed.add_field(name="Owner", value=g.owner.mention if g.owner else "-", inline=True)
        embed.add_field(name="Members", value=str(g.member_count), inline=True)
        embed.add_field(name="Channels", value=str(len(g.channels)), inline=True)
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @discord.ui.button(label="Now Playing", style=discord.ButtonStyle.secondary, emoji="🎵", custom_id="panel_nowplaying", row=1)
    async def nowplaying_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        current = now_playing.get(interaction.guild.id)
        if not current:
            await interaction.response.send_message(embed=quick_embed("❌ Nothing is currently playing."), ephemeral=True)
            return
        embed = discord.Embed(
            title="🎶 Now Playing",
            description=f"**[{current['title']}]({current['url']})**\n⏱️ Duration: `{current['duration']}`",
            color=0x2f3136,
        )
        if current.get("thumbnail"):
            embed.set_thumbnail(url=current["thumbnail"])
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @discord.ui.button(label="My Rank", style=discord.ButtonStyle.secondary, emoji="📈", custom_id="panel_rank", row=1)
    async def rank_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        xp, level = get_level_data(interaction.guild.id, interaction.user.id)
        needed_for_next = xp_for_level(level + 1)
        needed_for_current = xp_for_level(level)
        progress = xp - needed_for_current
        span = needed_for_next - needed_for_current
        bar = make_progress_bar(progress, span)
        embed = discord.Embed(title=f"📈 Rank — {interaction.user.display_name}", color=discord.Color.blurple())
        embed.add_field(name="Level", value=str(level), inline=True)
        embed.add_field(name="Total XP", value=str(xp), inline=True)
        embed.add_field(name="Progress", value=f"`{bar}` {progress}/{span} XP", inline=False)
        await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.hybrid_command(name="panel", description="[Staff] Post the interactive control panel")
@commands.has_role(REQUIRED_ROLE_ID)
async def control_panel_prefix(ctx):
    embed = discord.Embed(
        title="🕹️ Server Control Panel",
        description=(
            "Use the buttons below for quick access to common actions:\n\n"
            "🎫 **Open Ticket** — start a private conversation with staff\n"
            "✅ **Vouch Someone** — leave reputation feedback for a member\n"
            "📊 **Server Info** — see stats about this server\n"
            "🎵 **Now Playing** — check the current music track\n"
            "📈 **My Rank** — check your level and XP"
        ),
        color=0x2f3136,
    )
    embed.set_footer(text="🐰 Matrix System Active 🌟")
    await ctx.send(embed=embed, view=ControlPanelView())

@mod_group.command(name="panel", description="🕹️ Post the interactive server control panel.")
@has_required_slash_role()
async def control_panel_slash(interaction: discord.Interaction):
    embed = discord.Embed(
        title="🕹️ Server Control Panel",
        description=(
            "Use the buttons below for quick access to common actions:\n\n"
            "🎫 **Open Ticket** — start a private conversation with staff\n"
            "✅ **Vouch Someone** — leave reputation feedback for a member\n"
            "📊 **Server Info** — see stats about this server\n"
            "🎵 **Now Playing** — check the current music track\n"
            "📈 **My Rank** — check your level and XP"
        ),
        color=0x2f3136,
    )
    embed.set_footer(text="🐰 Matrix System Active 🌟")
    await interaction.response.send_message(embed=embed, view=ControlPanelView())


# ==========================================
#         🛠️ INTERACTIVE DROPDOWN SETUP MODULES
# ==========================================

class SetupChannelDropdown(discord.ui.ChannelSelect):
    def __init__(self, config_type: str):
        self.config_type = config_type
        super().__init__(
            placeholder=f"Select a target channel for {config_type.upper()} operations...",
            min_values=1,
            max_values=1,
            channel_types=[discord.ChannelType.text]
        )

    async def callback(self, interaction: discord.Interaction):
        selected_channel = self.values[0]
        set_config(interaction.guild.id, self.config_type, selected_channel.id)
        embed = discord.Embed(title="⚙️ Setup Configuration Completed", description=f"bound **{self.config_type}** to {selected_channel.mention}", color=discord.Color.green())
        await interaction.response.edit_message(embed=embed, view=None)

class SetupDashboardDropdown(discord.ui.Select):
    def __init__(self):
        options = [
            discord.SelectOption(label="Set Welcome Greetings", emoji="👋", value="set_welcome"),
            discord.SelectOption(label="Set Moderation Logs", emoji="📝", value="set_logs")
        ]
        super().__init__(placeholder="Select a module area framework...", min_values=1, max_values=1, options=options)

    async def callback(self, interaction: discord.Interaction):
        selection = self.values[0]
        new_view = discord.ui.View()
        if selection == "set_welcome":
            new_view.add_item(SetupChannelDropdown("welcome"))
            await interaction.response.edit_message(embed=discord.Embed(title="👋 Welcome greetings room routing", description="Select channel context:", color=0x2f3136), view=new_view)
        elif selection == "set_logs":
            new_view.add_item(SetupChannelDropdown("logs"))
            await interaction.response.edit_message(embed=discord.Embed(title="📝 Mod log updates mapping", description="Select channel context:", color=0x2f3136), view=new_view)

class SetupDashboardView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=180)
        self.add_item(SetupDashboardDropdown())


# ==========================================
#         ⚙️ COMMUNITY HELP MENU STRUCTURE
# ==========================================

HELP_CATEGORIES = {
    "community": {
        "label": "Community",
        "emoji": "👥",
        "title": "👥 Community Commands",
        "description": "__**Fun & everyday commands anyone can use.**__ Every command below also works as a `/slash` command.",
        "fields": [
            ("🎲 Fun & Random", (
                "`?gif <keywords>` — Random GIF for your keywords.\n"
                "`?meme` — Random meme image.\n"
                "`?8ball <question>` — Magic 8-ball replies.\n"
                "`?roll [sides]` / `?coinflip` / `?choose a | b | c` — Random pickers.\n"
                "`?throw/?hug/?kiss/?pat/?slap/?poke/?wave/?dance/?cry/?blush [@user]` — Action GIFs."
            )),
            ("ℹ️ Info Tools", (
                "`?serverinfo` — Info about this server.\n"
                "`?userinfo [@user]` — Info about a member.\n"
                "`?avatar [@user]` — Grab someone's avatar.\n"
                "`?ping` — Check the bot's latency."
            )),
        ],
    },
    "marriage": {
        "label": "Marriage",
        "emoji": "💍",
        "title": "💍 Marriage System",
        "description": "__**Propose, check on, or end a server marriage.**__",
        "fields": [
            ("💍 Commands", (
                "`?marry @user` / `/marry` — Propose marriage (they must Accept/Decline).\n"
                "`?family [@user]` / `/family` — Check who someone is married to and since when.\n"
                "`?divorce` / `/divorce` — Request a divorce (your partner must confirm)."
            )),
        ],
    },
    "music": {
        "label": "Music",
        "emoji": "🎵",
        "title": "🎵 Voice Channel Audio",
        "description": "__**Play music together in voice channels.**__ Every command below also works as a `/slash` command.",
        "fields": [
            ("🎶 Playback", (
                "`?play <song name or url>` — Connect and stream tracks.\n"
                "`?skip` — Force skip the current track.\n"
                "`?queue` — View the current queue and now-playing track.\n"
                "`?nowplaying` — Show details on what's currently playing.\n"
                "`?volume <0-200>` — Adjust playback volume.\n"
                "`?loop <off|track|queue>` — Toggle looping.\n"
                "`?stop` — Stop playback and clear the queue.\n"
                "`?leave` — Disconnect from voice."
            )),
            ("❤️ Your Playlist", (
                "`?like <url> [title]` — Save a track to your personal playlist.\n"
                "`?playlist [view/play/clear]` — View, play, or wipe your saved playlist."
            )),
        ],
    },
    "vouch": {
        "label": "Vouching",
        "emoji": "✅",
        "title": "✅ Vouching System",
        "description": "__**Leave and track reputation feedback for members.**__",
        "fields": [
            ("✅ Commands", (
                "`?vouch @user [comment]` / `/vouch` — Leave positive feedback for someone.\n"
                "`?unvouch @user` / `/unvouch` — Remove your most recent vouch for someone.\n"
                "`?vouches [@user]` / `/vouches` — See someone's vouch count and history.\n"
                "`?vouchleaderboard` / `/vouchleaderboard` — Top vouched members."
            )),
        ],
    },
    "leveling": {
        "label": "Leveling",
        "emoji": "📈",
        "title": "📈 Leveling System",
        "description": "__**Earn XP by chatting and climb the leaderboard.**__ *(One XP grant every 60s per person.)*",
        "fields": [
            ("📈 Commands", (
                "`?rank [@user]` / `/rank` — Check level and XP progress.\n"
                "`?levelleaderboard` / `/levelleaderboard` — Top XP earners in this server."
            )),
        ],
    },
    "tickets": {
        "label": "Tickets",
        "emoji": "🎫",
        "title": "🎫 Tickets & Control Panel",
        "description": "__**Open a private support ticket, or (staff) manage the ticket system.**__",
        "fields": [
            ("🎫 For Everyone", (
                "`?ticket` / `/ticket` — Open a private support ticket.\n"
                "`?closeticket` / `/closeticket` — Close the ticket you're currently in."
            )),
            ("🕹️ Staff Only", (
                "`?ticketpanel` / `/ticketpanel` — **[Staff]** Post a button-based ticket-creation panel.\n"
                "`?panel` / `/panel` — **[Staff]** Post the all-in-one interactive control panel."
            )),
        ],
    },
    "moderation": {
        "label": "Moderation",
        "emoji": "🛡️",
        "title": "🛡️ Moderator Utilities",
        "description": "__**Staff-only moderation tools.**__ Prefix (`?`) and slash (`/mod ...`) equivalents both work.",
        "fields": [
            ("🛡️ Enforcement", (
                "`?warn @user [reason]` — Issue a warning (auto-timeout at 3).\n"
                "`?warnings [@user]` / `?clearwarnings @user` — Check / reset warnings.\n"
                "`?mute @user [minutes] [reason]` / `?unmute @user` — Timeout a member.\n"
                "`?kick @user [reason]` / `?ban @user [reason]` / `?unban <user_id>` — Real enforcement.\n"
                "`?reactionrole <message_id> <emoji> [@role]` — Bind/unbind an emoji-role reaction."
            )),
            ("⚙️ /mod Setup", (
                "`/mod setup` — Interactive setup menu.\n"
                "`/mod setwelcome <channel>` / `/mod setlogs <channel>` — Route channels.\n"
                "`/mod clear <amount>` — Purge messages in the current channel.\n"
                "`/mod warn/mute/unmute/kick/ban/unban` — Slash equivalents of the above.\n"
                "`/mod panel` — Post the interactive control panel."
            )),
        ],
    },
    "custom": {
        "label": "Custom Commands",
        "emoji": "🔐",
        "title": "🔐 Permissions & 💬 Custom Commands",
        "description": "__**Staff-only: lock down commands or add your own auto-replies.**__",
        "fields": [
            ("🔐 Command Permissions", (
                "`/cmdperm-allow <command> <role>` — Restrict a command to a role.\n"
                "`/cmdperm-deny <command> <role>` — Remove a role's access.\n"
                "`/cmdperm-list` — Show all restricted commands.\n"
                "`/cmdperm-reset <command>` — Clear all restrictions on a command."
            )),
            ("💬 Custom Commands", (
                "`/new-command <trigger> <response>` — Auto-reply on an exact trigger.\n"
                "`/delete-command <trigger>` — Remove a custom trigger.\n"
                "`/list-commands` — List all custom triggers."
            )),
        ],
    },
    "config": {
        "label": "Server Config",
        "emoji": "👋",
        "title": "👋 Welcomer & 📈 Leveling Config",
        "description": "__**Staff-only server configuration.**__",
        "fields": [
            ("⚙️ Settings", (
                "`/mod setwelcome <channel>` — Set the welcome channel.\n"
                "`/mod setwelcomemessage <text>` — Custom greeting (`{user} {username} {server} {membercount}`).\n"
                "`/mod clearwelcomemessage` — Reset to the default greeting.\n"
                "`/mod setlevelchannel <channel>` / `/mod clearlevelchannel` — Route level-up announcements.\n"
                "`/mod togglelevels <true/false>` — Turn the XP/leveling system on or off.\n"
                "`/mod setlogs <channel>` — Set the edit/delete log channel."
            )),
        ],
    },
}

HELP_HOME_TITLE = "🐰 ── UNITED BUNNIES HELP ── 🐰"
HELP_HOME_DESCRIPTION = (
    "__**Welcome to the Command Center.**__\n"
    "Pick a category from the dropdown below to see what's inside, or use the "
    "buttons for **support** and the **web dashboard**.\n\n"
    "Most commands work with the `?` prefix **or** as a `/slash` command."
)


def build_help_home_embed() -> discord.Embed:
    embed = discord.Embed(
        title=HELP_HOME_TITLE,
        description=HELP_HOME_DESCRIPTION,
        color=BRAND_COLOR,
        timestamp=datetime.datetime.now(UTC),
    )
    category_list = "\n".join(f"{c['emoji']} **{c['label']}**" for c in HELP_CATEGORIES.values())
    embed.add_field(name="📂 Categories", value=category_list, inline=False)
    embed.set_footer(text="United Bunnies • Use the menu below to browse commands")
    return embed


def build_help_category_embed(key: str) -> discord.Embed:
    cat = HELP_CATEGORIES[key]
    embed = discord.Embed(
        title=cat["title"],
        description=cat["description"],
        color=BRAND_COLOR,
        timestamp=datetime.datetime.now(UTC),
    )
    for name, value in cat["fields"]:
        embed.add_field(name=f"__**{name}**__", value=value, inline=False)
    embed.set_footer(text="United Bunnies • Use the menu below to browse other categories")
    return embed


class HelpCategorySelect(discord.ui.Select):
    def __init__(self):
        options = [
            discord.SelectOption(label=cat["label"], value=key, emoji=cat["emoji"])
            for key, cat in HELP_CATEGORIES.items()
        ]
        super().__init__(placeholder="📂 Select a command category…", options=options, min_values=1, max_values=1)

    async def callback(self, interaction: discord.Interaction):
        key = self.values[0]
        embed = build_help_category_embed(key)
        await interaction.response.edit_message(embed=embed, view=HelpView())


class HelpHomeButton(discord.ui.Button):
    def __init__(self):
        super().__init__(label="Home", emoji="🏠", style=discord.ButtonStyle.secondary, row=1)

    async def callback(self, interaction: discord.Interaction):
        embed = build_help_home_embed()
        await interaction.response.edit_message(embed=embed, view=HelpView())


class HelpView(discord.ui.View):
    """Persistent help menu: category dropdown + Home/Support/Dashboard buttons."""
    def __init__(self):
        super().__init__(timeout=180)
        self.add_item(HelpCategorySelect())
        self.add_item(HelpHomeButton())
        self.add_item(discord.ui.Button(label="Support", emoji="🛟", style=discord.ButtonStyle.link, url=SUPPORT_SERVER_URL, row=1))
        self.add_item(discord.ui.Button(label="Dashboard", emoji="📊", style=discord.ButtonStyle.link, url=DASHBOARD_URL, row=1))

    async def on_timeout(self):
        for item in self.children:
            item.disabled = True


@bot.hybrid_command(name="help", description="Show the command list")
async def help_prefix(ctx):
    embed = build_help_home_embed()
    await ctx.send(embed=embed, view=HelpView())


@bot.hybrid_command(name="afk", description="Set yourself as AFK")
@commands.has_role(REQUIRED_ROLE_ID)
@app_commands.describe(reason="Why you're AFK (optional)")
async def afk_prefix(ctx, *, reason: str = "AFK"):
    afk_users[ctx.author.id] = {"reason": reason, "timestamp": datetime.datetime.now(), "old_name": ctx.author.nick}
    try: await ctx.author.edit(nick=f"[AFK] {ctx.author.display_name[:25]}")
    except Exception: pass
    await ctx.send(embed=quick_embed(f"💤 {ctx.author.mention} is now AFK."))

@bot.hybrid_command(name="ping", description="Check the bot's latency")
@commands.has_role(REQUIRED_ROLE_ID)
async def ping_prefix(ctx):
    await ctx.send(embed=quick_embed(f"🛰️ Latency: `{round(bot.latency * 1000)}ms`"))

async def send_gif_embed(channel, query: str, title: str = None):
    loop = asyncio.get_running_loop()
    gif_url = await loop.run_in_executor(None, fetch_giphy_gif_url, query)
    if not gif_url:
        if not GIPHY_API_KEY:
            await channel.send(embed=quick_embed("❌ GIPHY_API_KEY is missing on the server."))
        else:
            await channel.send(embed=quick_embed("❌ No GIF found. Try different keywords."))
        return
    embed = discord.Embed(color=0x2f3136, timestamp=datetime.datetime.now(UTC))
    if title:
        embed.title = title
    embed.set_image(url=gif_url)
    await channel.send(embed=embed)

@bot.hybrid_command(name="gif", description="Send a random GIF for a keyword")
@app_commands.describe(query="Search keywords")
async def gif_prefix(ctx, *, query: str = None):
    if not query:
        await ctx.send(embed=quick_embed("❌ Syntax: `?gif <search keywords>`"))
        return
    async with ctx.typing():
        await send_gif_embed(ctx.channel, query, title=f"GIF: {query}")

async def action_gif(ctx, action: str, target: discord.Member = None, query: str = None):
    target = target or ctx.author
    text = f"{ctx.author.mention} {action} {target.mention}"
    await ctx.send(text)
    async with ctx.typing():
        await send_gif_embed(ctx.channel, query or f"{action} gif", title=None)

@bot.hybrid_command(name="hug", description="Give someone a hug")
@app_commands.describe(member="Who to hug")
async def hug_prefix(ctx, member: discord.Member = None):
    await action_gif(ctx, "hugs", member, "anime hug")

@bot.hybrid_command(name="kiss", description="Give someone a kiss")
@app_commands.describe(member="Who to kiss")
async def kiss_prefix(ctx, member: discord.Member = None):
    await action_gif(ctx, "kisses", member, "anime kiss")

@bot.hybrid_command(name="pat", description="Pat someone on the head")
@app_commands.describe(member="Who to pat")
async def pat_prefix(ctx, member: discord.Member = None):
    await action_gif(ctx, "pats", member, "anime pat")

@bot.hybrid_command(name="throw", description="Throw something at someone (in fun)")
@app_commands.describe(member="Who to throw at")
async def throw_prefix(ctx, member: discord.Member = None):
    await action_gif(ctx, "throws", member, "anime throw")

@bot.hybrid_command(name="slap", description="Slap someone")
@app_commands.describe(member="Who to slap")
async def slap_prefix(ctx, member: discord.Member = None):
    await action_gif(ctx, "slaps", member, "anime slap")

@bot.hybrid_command(name="poke", description="Poke someone")
@app_commands.describe(member="Who to poke")
async def poke_prefix(ctx, member: discord.Member = None):
    await action_gif(ctx, "pokes", member, "anime poke")

@bot.hybrid_command(name="wave", description="Wave at someone")
@app_commands.describe(member="Who to wave at")
async def wave_prefix(ctx, member: discord.Member = None):
    await action_gif(ctx, "waves at", member, "anime wave")

@bot.hybrid_command(name="dance", description="Dance with someone")
@app_commands.describe(member="Who to dance with")
async def dance_prefix(ctx, member: discord.Member = None):
    await action_gif(ctx, "dances with", member, "anime dance")

@bot.hybrid_command(name="cry", description="Cry at someone")
@app_commands.describe(member="Who to cry at")
async def cry_prefix(ctx, member: discord.Member = None):
    await action_gif(ctx, "cries at", member, "anime cry")

@bot.hybrid_command(name="blush", description="Blush at someone")
@app_commands.describe(member="Who to blush at")
async def blush_prefix(ctx, member: discord.Member = None):
    await action_gif(ctx, "blushes at", member, "anime blush")

@bot.hybrid_command(name="roll", description="Roll a dice")
@app_commands.describe(sides="Number of sides (default 6)")
async def roll_prefix(ctx, sides: int = 6):
    sides = max(2, min(1000, sides))
    result = random.randint(1, sides)
    await ctx.send(embed=quick_embed(f"🎲 You rolled a **{result}** (1-{sides})"))

@bot.hybrid_command(name="coinflip", aliases=["flip"], description="Flip a coin")
async def coinflip_prefix(ctx):
    result = random.choice(["Heads", "Tails"])
    await ctx.send(embed=quick_embed(f"🪙 **{result}!**"))

@bot.hybrid_command(name="choose", description="Pick randomly between options")
@app_commands.describe(options="Options separated by | (e.g. a | b | c)")
async def choose_prefix(ctx, *, options: str = None):
    if not options or "|" not in options:
        await ctx.send(embed=quick_embed("❌ Syntax: `?choose option1 | option2 | option3`"))
        return
    choices = [o.strip() for o in options.split("|") if o.strip()]
    if len(choices) < 2:
        await ctx.send(embed=quick_embed("❌ Give me at least two options, separated by `|`."))
        return
    await ctx.send(embed=quick_embed(f"🤔 I choose: **{random.choice(choices)}**"))

@bot.hybrid_command(name="8ball", description="Ask the magic 8-ball a question")
@app_commands.describe(question="Your question")
async def eightball_prefix(ctx, *, question: str = None):
    if not question:
        await ctx.send(embed=quick_embed("❌ Syntax: `?8ball <question>`"))
        return
    answers = [
        "Yes.",
        "No.",
        "Maybe.",
        "Ask again later.",
        "Absolutely.",
        "Not a chance.",
        "It is certain.",
        "Very doubtful.",
    ]
    await ctx.send(embed=quick_embed(f"🎱 {random.choice(answers)}"))

@bot.hybrid_command(name="avatar", description="Get a user's avatar")
@app_commands.describe(member="User to check (defaults to yourself)")
async def avatar_prefix(ctx, member: discord.Member = None):
    member = member or ctx.author
    embed = discord.Embed(title=f"{member.display_name}'s Avatar", color=0x2f3136)
    embed.set_image(url=member.display_avatar.url)
    await ctx.send(embed=embed)

@bot.hybrid_command(name="userinfo", description="Get info about a user")
@app_commands.describe(member="User to check (defaults to yourself)")
async def userinfo_prefix(ctx, member: discord.Member = None):
    member = member or ctx.author
    embed = discord.Embed(title=f"User Info: {member}", color=0x2f3136, timestamp=datetime.datetime.now(UTC))
    embed.set_thumbnail(url=member.display_avatar.url)
    embed.add_field(name="ID", value=str(member.id), inline=True)
    embed.add_field(name="Top Role", value=member.top_role.mention if member.top_role else "-", inline=True)
    embed.add_field(name="Account Created", value=discord.utils.format_dt(member.created_at, style="F"), inline=False)
    if member.joined_at:
        embed.add_field(name="Joined Server", value=discord.utils.format_dt(member.joined_at, style="F"), inline=False)
    await ctx.send(embed=embed)

@bot.hybrid_command(name="serverinfo", description="Get info about this server")
async def serverinfo_prefix(ctx):
    g = ctx.guild
    embed = discord.Embed(title=f"Server Info: {g.name}", color=0x2f3136, timestamp=datetime.datetime.now(UTC))
    if g.icon:
        embed.set_thumbnail(url=g.icon.url)
    embed.add_field(name="ID", value=str(g.id), inline=True)
    embed.add_field(name="Owner", value=g.owner.mention if g.owner else "-", inline=True)
    embed.add_field(name="Created", value=discord.utils.format_dt(g.created_at, style="F"), inline=False)
    embed.add_field(name="Members", value=str(g.member_count), inline=True)
    embed.add_field(name="Channels", value=str(len(g.channels)), inline=True)
    await ctx.send(embed=embed)

@bot.hybrid_command(name="meme", description="Get a random meme")
async def meme_prefix(ctx):
    async with ctx.typing():
        try:
            resp = requests.get("https://meme-api.com/gimme", timeout=12)
            resp.raise_for_status()
            data = resp.json()
            meme_url = data.get("url")
            title = data.get("title") or "Meme"
        except Exception:
            meme_url = None
            title = None
    if not meme_url:
        await ctx.send(embed=quick_embed("❌ Meme fetch failed. Try again."))
        return
    embed = discord.Embed(title=title, color=0x2f3136)
    embed.set_image(url=meme_url)
    await ctx.send(embed=embed)

@bot.event
async def on_command_error(ctx, error):
    if isinstance(error, commands.CommandNotFound):
        return
    if isinstance(error, commands.MissingRole) or isinstance(error, commands.MissingPermissions):
        await ctx.send(embed=quick_embed("❌ You don't have permission to use that command."), delete_after=6)
        return
    if isinstance(error, commands.MissingRequiredArgument):
        await ctx.send(embed=quick_embed("❌ Missing arguments. Use `?help` for usage."), delete_after=6)
        return
    if isinstance(error, commands.CheckFailure):
        await ctx.send(str(error) or "❌ You don't have permission to use that command.", delete_after=6)
        return
    await ctx.send(embed=quick_embed(f"❌ Error: {error}"), delete_after=8)

@bot.tree.error
async def on_app_command_error(interaction: discord.Interaction, error: app_commands.AppCommandError):
    if isinstance(error, app_commands.CheckFailure):
        if interaction.response.is_done():
            await interaction.followup.send("❌ You don't have permission to use that command.", ephemeral=True)
        else:
            await interaction.response.send_message(embed=quick_embed("❌ You don't have permission to use that command."), ephemeral=True)
        return
    if interaction.response.is_done():
        await interaction.followup.send(f"❌ Error: {error}", ephemeral=True)
    else:
        await interaction.response.send_message(embed=quick_embed(f"❌ Error: {error}"), ephemeral=True)


# ==========================================
#         Modern Moderation Subcommands (/mod)
# ==========================================

@mod_group.command(name="setup", description="🤖 Launch interactive dropdown configuration dashboards.")
@has_required_slash_role()
async def setup_slash(interaction: discord.Interaction):
    await interaction.response.send_message(embed=discord.Embed(title="🛠️ Server Configuration Dashboard", description="Configure server assets dynamically below:"), view=SetupDashboardView(), ephemeral=True)

@mod_group.command(name="help", description="🔨 View the Administrative Enforcement Deck.")
@has_required_slash_role()
async def mod_help_slash(interaction: discord.Interaction):
    embed = discord.Embed(
        title="🔨 Administrative Staff Enforcement Deck", 
        description="Comprehensive matrix listing all available automated and manual system tools:",
        color=discord.Color.orange()
    )
    
    embed.add_field(
        name="`⚙️ Configuration Modules`", 
        value=(
            "• `/mod setup` — Launches the interactive dropdown UI config dashboard.\n"
            "• `/mod setwelcome <channel>` — Manually routes member join greeting embeds.\n"
            "• `/mod setwelcomemessage <text>` / `/mod clearwelcomemessage` — Customize the greeting text.\n"
            "• `/mod setlogs <channel>` — Manually maps text edit and deletion tracking streams.\n"
            "• `/mod setlevelchannel <channel>` / `/mod clearlevelchannel` — Where level-ups get posted.\n"
            "• `/mod togglelevels <true/false>` — Turn the leveling/XP system on or off.\n"
            "• `/cmdperm-allow/deny/list/reset` — Restrict specific commands to specific roles.\n"
            "• `/new-command`, `/delete-command`, `/list-commands` — Custom auto-reply triggers.\n"
            "• `/mod panel` — Posts the interactive control panel (tickets, vouching, info, music, rank)."
        ), 
        inline=False
    )
    
    embed.add_field(
        name="`⚔️ Active Enforcement Parameters`", 
        value=(
            "• `/mod warn <user> [reason]` — Issues a manual warning (auto-timeout at 3 warnings).\n"
            "• `/mod warnings <user>` — Checks a member's current warning count.\n"
            "• `/mod clearwarnings <user>` — Resets a member's warnings to zero.\n"
            "• `/mod mute <user> [minutes] [reason]` / `/mod unmute <user>` — Timeout enforcement.\n"
            "• `/mod kick <user> [reason]` — Real removal from the server.\n"
            "• `/mod ban <user> [reason]` / `/mod unban <user_id>` — Real ban / unban.\n"
            "• `/mod clear <amount>` — Completely purges and wipes trailing message streams from a channel.\n"
            "• `?reactionrole <message_id> <emoji> [@role]` — Bind or remove an emoji-role reaction.\n"
            "• `?bon @user` — Cosmetic joke removal visuals (not a real ban)."
        ), 
        inline=False
    )

    embed.add_field(
        name="`📢 Public Server Broadcasts`", 
        value=(
            "• `?p [text]` — Generates the matrix announcement template with custom block structures.\n"
            "• `?ticketpanel` — Posts a standalone button for members to open support tickets."
        ), 
        inline=False
    )
    
    embed.set_footer(text="Core Security Verification Required • Commands limited strictly to Authorization Role ID.")
    await interaction.response.send_message(embed=embed)

@mod_group.command(name="setwelcome", description="🎯 Set targeted greeting text channel updates.")
@has_required_slash_role()
async def setwelcome_slash(interaction: discord.Interaction, channel: discord.TextChannel):
    set_config(interaction.guild.id, "welcome", channel.id)
    await interaction.response.send_message(embed=quick_embed(f"🎯 **Welcome channel mapped:** {channel.mention}"))

@mod_group.command(name="setlogs", description="🎯 Target channel for message edit/deletion logs.")
@has_required_slash_role()
async def setlogs_slash(interaction: discord.Interaction, channel: discord.TextChannel):
    set_config(interaction.guild.id, "logs", channel.id)
    await interaction.response.send_message(embed=quick_embed(f"🎯 **Log channel mapped:** {channel.mention}"))

@mod_group.command(name="setwelcomemessage", description="👋 Customize the welcome message sent to new members.")
@has_required_slash_role()
@app_commands.describe(message="Use {user}, {username}, {server}, {membercount} as placeholders")
async def setwelcomemessage_slash(interaction: discord.Interaction, message: str):
    set_welcome_message(interaction.guild.id, message)
    preview = format_welcome_message(message, interaction.user)
    embed = discord.Embed(
        title="👋 Welcome Message Updated",
        description=f"**Preview:**\n{preview}",
        color=discord.Color.green(),
    )
    embed.set_footer(text="Placeholders: {user} {username} {server} {membercount}")
    await interaction.response.send_message(embed=embed)

@mod_group.command(name="clearwelcomemessage", description="👋 Reset the welcome message back to the default.")
@has_required_slash_role()
async def clearwelcomemessage_slash(interaction: discord.Interaction):
    clear_welcome_message(interaction.guild.id)
    await interaction.response.send_message(embed=quick_embed("✅ Welcome message reset to the default."))

@mod_group.command(name="setlevelchannel", description="📈 Set the channel where level-up announcements are posted.")
@has_required_slash_role()
async def setlevelchannel_slash(interaction: discord.Interaction, channel: discord.TextChannel):
    set_levelup_channel(interaction.guild.id, channel.id)
    await interaction.response.send_message(embed=quick_embed(f"📈 **Level-up announcements will now post in:** {channel.mention}"))

@mod_group.command(name="clearlevelchannel", description="📈 Post level-ups in whichever channel the user leveled up in.")
@has_required_slash_role()
async def clearlevelchannel_slash(interaction: discord.Interaction):
    clear_levelup_channel(interaction.guild.id)
    await interaction.response.send_message(embed=quick_embed("✅ Level-up announcements will post in the channel the member was chatting in."))

@mod_group.command(name="togglelevels", description="📈 Turn the leveling/XP system on or off for this server.")
@has_required_slash_role()
@app_commands.describe(enabled="True to enable XP gain, False to disable it")
async def togglelevels_slash(interaction: discord.Interaction, enabled: bool):
    set_leveling_enabled(interaction.guild.id, enabled)
    status = "enabled ✅" if enabled else "disabled ❌"
    await interaction.response.send_message(embed=quick_embed(f"📈 Leveling system is now **{status}** in this server."))

@mod_group.command(name="clear", description="🗑️ Purge text streams from active channels.")
@has_required_slash_role()
async def clear_slash(interaction: discord.Interaction, amount: int):
    await interaction.response.defer(ephemeral=True)
    await interaction.channel.purge(limit=amount)
    await interaction.followup.send(f"🗑️ Wiped {amount} messages.", ephemeral=True)

@mod_group.command(name="setnoprefixrole", description="🔓 Set a role whose members can use commands without the ? prefix.")
@has_required_slash_role()
async def set_noprefix_role_slash(interaction: discord.Interaction, role: discord.Role):
    set_trusted_role_id(interaction.guild.id, role.id)
    await interaction.response.send_message(
        f"🔓 **No-prefix role set:** anyone with {role.mention} can now run any command without typing `?` first.\n"
        f"⚠️ Moderation commands (ban/kick/mute/warn/etc.) will still ask for confirmation before running.",
    )

@mod_group.command(name="clearnoprefixrole", description="🔒 Remove the no-prefix trusted role.")
@has_required_slash_role()
async def clear_noprefix_role_slash(interaction: discord.Interaction):
    clear_trusted_role_id(interaction.guild.id)
    await interaction.response.send_message(embed=quick_embed("🔒 No-prefix trusted role cleared."))

@mod_group.command(name="grantnoprefix", description="🔓 Let a specific user run commands without the ? prefix.")
@has_required_slash_role()
async def grant_noprefix_slash(interaction: discord.Interaction, member: discord.Member):
    grant_noprefix(interaction.guild.id, member.id)
    await interaction.response.send_message(embed=quick_embed(f"🔓 {member.mention} can now use bot commands without the `?` prefix."))

@mod_group.command(name="revokenoprefix", description="🔒 Remove a user's individual no-prefix permission.")
@has_required_slash_role()
async def revoke_noprefix_slash(interaction: discord.Interaction, member: discord.Member):
    removed = revoke_noprefix(interaction.guild.id, member.id)
    if removed:
        await interaction.response.send_message(embed=quick_embed(f"🔒 {member.mention}'s no-prefix permission was removed."))
    else:
        await interaction.response.send_message(embed=quick_embed(f"❗ {member.mention} didn't have an individual no-prefix grant (they may still have it via a role)."), ephemeral=True)

@mod_group.command(name="listnoprefix", description="📋 List users individually granted no-prefix permission.")
@has_required_slash_role()
async def list_noprefix_slash(interaction: discord.Interaction):
    user_ids = list_noprefix_users(interaction.guild.id)
    trusted_id = get_trusted_role_id(interaction.guild.id)
    lines = []
    if trusted_id:
        role = interaction.guild.get_role(trusted_id)
        lines.append(f"**Trusted role:** {role.mention if role else '*(deleted role)*'}")
    if user_ids:
        mentions = ", ".join(f"<@{uid}>" for uid in user_ids)
        lines.append(f"**Individually granted:** {mentions}")
    if not lines:
        lines.append("No no-prefix role or individual grants configured yet.")
    embed = discord.Embed(title="🔓 No-Prefix Permissions", description="\n\n".join(lines), color=discord.Color.blurple())
    await interaction.response.send_message(embed=embed)

@mod_group.command(name="warn", description="⚠️ Issue a manual warning to a member.")
@has_required_slash_role()
async def warn_slash(interaction: discord.Interaction, member: discord.Member, reason: str = "No reason provided"):
    current = update_warnings(member.id, 1)
    embed = discord.Embed(
        title="⚠️ Warning Issued",
        description=f"{member.mention} has been warned by {interaction.user.mention}.\n__**Reason:**__ {reason}\n__**Total warnings:**__ {current}/3",
        color=discord.Color.orange(),
    )
    await interaction.response.send_message(embed=embed)
    if current >= 3:
        reset_warnings(member.id)
        try:
            await member.timeout(datetime.timedelta(minutes=10), reason="Reached 3 warnings")
            await interaction.followup.send(f"🤫 **{member.display_name}** has been auto-timed out for 10 minutes after reaching 3 warnings.")
        except discord.Forbidden:
            await interaction.followup.send("⚠️ Reached 3 warnings, but I don't have permission to timeout that user.")

@mod_group.command(name="warnings", description="📋 Check a member's current warning count.")
@has_required_slash_role()
async def warnings_slash(interaction: discord.Interaction, member: discord.Member):
    count = get_warnings(member.id)
    await interaction.response.send_message(embed=quick_embed(f"📋 **{member.display_name}** currently has **{count}/3** warnings."))

@mod_group.command(name="clearwarnings", description="✅ Reset a member's warning count to zero.")
@has_required_slash_role()
async def clearwarnings_slash(interaction: discord.Interaction, member: discord.Member):
    reset_warnings(member.id)
    await interaction.response.send_message(embed=quick_embed(f"✅ Cleared all warnings for **{member.display_name}**."))

@mod_group.command(name="mute", description="🤫 Timeout a member for a number of minutes.")
@has_required_slash_role()
async def mute_slash(interaction: discord.Interaction, member: discord.Member, minutes: int = 10, reason: str = "No reason provided"):
    minutes = max(1, min(40320, minutes))
    try:
        await member.timeout(datetime.timedelta(minutes=minutes), reason=f"{reason} (by {interaction.user})")
    except discord.Forbidden:
        await interaction.response.send_message(embed=quick_embed("❌ I don't have permission to timeout that user."), ephemeral=True)
        return
    embed = discord.Embed(
        title="🤫 Member Muted",
        description=f"{member.mention} has been muted for **{minutes} minute(s)**.\n__**Reason:**__ {reason}",
        color=discord.Color.orange(),
    )
    await interaction.response.send_message(embed=embed)

@mod_group.command(name="unmute", description="🔊 Remove a member's timeout.")
@has_required_slash_role()
async def unmute_slash(interaction: discord.Interaction, member: discord.Member):
    try:
        await member.timeout(None, reason=f"Unmuted by {interaction.user}")
    except discord.Forbidden:
        await interaction.response.send_message(embed=quick_embed("❌ I don't have permission to unmute that user."), ephemeral=True)
        return
    await interaction.response.send_message(embed=quick_embed(f"🔊 **{member.display_name}** has been unmuted."))

@mod_group.command(name="kick", description="👢 Kick a member from the server.")
@has_required_slash_role()
async def kick_slash(interaction: discord.Interaction, member: discord.Member, reason: str = "No reason provided"):
    if member.top_role >= interaction.user.top_role and interaction.user.id != interaction.guild.owner_id:
        await interaction.response.send_message(embed=quick_embed("❌ You can't kick someone with an equal or higher role than you."), ephemeral=True)
        return
    try:
        await member.kick(reason=f"{reason} (by {interaction.user})")
    except discord.Forbidden:
        await interaction.response.send_message(embed=quick_embed("❌ I don't have permission to kick that user."), ephemeral=True)
        return
    embed = discord.Embed(title="👢 Member Kicked", description=f"**{member}** was kicked.\n__**Reason:**__ {reason}", color=discord.Color.orange())
    await interaction.response.send_message(embed=embed)

@mod_group.command(name="ban", description="🔨 Ban a member from the server.")
@has_required_slash_role()
async def ban_slash(interaction: discord.Interaction, member: discord.Member, reason: str = "No reason provided"):
    if member.top_role >= interaction.user.top_role and interaction.user.id != interaction.guild.owner_id:
        await interaction.response.send_message(embed=quick_embed("❌ You can't ban someone with an equal or higher role than you."), ephemeral=True)
        return
    try:
        await member.ban(reason=f"{reason} (by {interaction.user})")
    except discord.Forbidden:
        await interaction.response.send_message(embed=quick_embed("❌ I don't have permission to ban that user."), ephemeral=True)
        return
    embed = discord.Embed(title="🔨 Member Banned", description=f"**{member}** was banned.\n__**Reason:**__ {reason}", color=discord.Color.red())
    await interaction.response.send_message(embed=embed)

@mod_group.command(name="unban", description="✅ Unban a user by ID.")
@has_required_slash_role()
async def unban_slash(interaction: discord.Interaction, user_id: str, reason: str = "No reason provided"):
    try:
        uid = int(user_id)
        user = await bot.fetch_user(uid)
        await interaction.guild.unban(user, reason=f"{reason} (by {interaction.user})")
    except ValueError:
        await interaction.response.send_message(embed=quick_embed("❌ That doesn't look like a valid user ID."), ephemeral=True)
        return
    except discord.NotFound:
        await interaction.response.send_message(embed=quick_embed("❌ That user isn't banned."), ephemeral=True)
        return
    except discord.Forbidden:
        await interaction.response.send_message(embed=quick_embed("❌ I don't have permission to unban."), ephemeral=True)
        return
    await interaction.response.send_message(embed=quick_embed(f"✅ Unbanned **{user}**."))


# ==========================================
#     🔐 PER-COMMAND ROLE PERMISSIONS (/cmdperm-*)
# ==========================================
# Lets staff restrict any prefix/hybrid command to one or more roles. A
# command with no restrictions configured stays open to everyone. Staff
# (REQUIRED_ROLE_ID) can always use every command regardless of this table.

@bot.tree.command(name="cmdperm-allow", description="🔐 [Mod] Restrict a command to a specific role.")
@has_required_slash_role()
@app_commands.describe(command="Exact command name (e.g. 'play', 'ticket')", role="Role allowed to use it")
async def cmdperm_allow_slash(interaction: discord.Interaction, command: str, role: discord.Role):
    command = command.strip().lstrip("?/").lower()
    if bot.get_command(command) is None:
        await interaction.response.send_message(embed=quick_embed(f"❌ No command named `{command}` exists."), ephemeral=True)
        return
    add_command_permission(interaction.guild.id, command, role.id)
    await interaction.response.send_message(embed=quick_embed(f"🔐 `{command}` is now restricted to {role.mention} (and staff)."))

@bot.tree.command(name="cmdperm-deny", description="🔐 [Mod] Remove a role's access to a restricted command.")
@has_required_slash_role()
@app_commands.describe(command="Exact command name", role="Role to remove access from")
async def cmdperm_deny_slash(interaction: discord.Interaction, command: str, role: discord.Role):
    command = command.strip().lstrip("?/").lower()
    removed = remove_command_permission(interaction.guild.id, command, role.id)
    if removed:
        await interaction.response.send_message(embed=quick_embed(f"🔒 {role.mention} can no longer use `{command}` (unless another allowed role/staff)."))
    else:
        await interaction.response.send_message(embed=quick_embed(f"❗ {role.mention} wasn't specifically allowed for `{command}`."), ephemeral=True)

@bot.tree.command(name="cmdperm-list", description="🔐 Show which commands are restricted and to whom.")
@has_required_slash_role()
async def cmdperm_list_slash(interaction: discord.Interaction):
    perms = list_command_permissions(interaction.guild.id)
    if not perms:
        await interaction.response.send_message(embed=quick_embed("📋 No commands are currently restricted — everything is open to everyone (plus staff)."))
        return
    lines = []
    for cmd_name, role_ids in perms.items():
        mentions = ", ".join(f"<@&{rid}>" for rid in role_ids)
        lines.append(f"**?{cmd_name}** — {mentions}")
    embed = discord.Embed(title="🔐 Restricted Commands", description="\n".join(lines), color=discord.Color.blurple())
    embed.set_footer(text="Staff (the required role) can always use every command.")
    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="cmdperm-reset", description="🔐 [Mod] Clear all role restrictions on a command.")
@has_required_slash_role()
@app_commands.describe(command="Exact command name to fully unrestrict")
async def cmdperm_reset_slash(interaction: discord.Interaction, command: str):
    command = command.strip().lstrip("?/").lower()
    changed = reset_command_permissions(interaction.guild.id, command)
    if changed:
        await interaction.response.send_message(embed=quick_embed(f"✅ `{command}` is now open to everyone again."))
    else:
        await interaction.response.send_message(embed=quick_embed(f"❗ `{command}` had no restrictions to clear."), ephemeral=True)


# ==========================================
#   💬 CUSTOM AUTO-RESPONDER ("if someone types X, bot sends Y")
# ==========================================

@bot.tree.command(name="new-command", description="💬 [Mod] Make the bot auto-reply when someone types an exact phrase.")
@has_required_slash_role()
@app_commands.describe(trigger="Exact phrase that fires the response (not case-sensitive)", response="What the bot should send back")
async def new_command_slash(interaction: discord.Interaction, trigger: str, response: str):
    trigger_key = trigger.strip().lower()
    if not trigger_key:
        await interaction.response.send_message(embed=quick_embed("❌ Trigger can't be empty."), ephemeral=True)
        return
    add_custom_command(interaction.guild.id, trigger_key, response, interaction.user.id)
    embed = discord.Embed(
        title="💬 Custom Command Saved",
        description=f"When someone types:\n> {trigger}\n\nI'll reply with:\n> {response}",
        color=discord.Color.green(),
    )
    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="delete-command", description="💬 [Mod] Remove a custom auto-responder trigger.")
@has_required_slash_role()
@app_commands.describe(trigger="The exact trigger phrase to remove")
async def delete_command_slash(interaction: discord.Interaction, trigger: str):
    removed = remove_custom_command(interaction.guild.id, trigger.strip().lower())
    if removed:
        await interaction.response.send_message(embed=quick_embed(f"🗑️ Removed the custom command for `{trigger}`."))
    else:
        await interaction.response.send_message(embed=quick_embed(f"❗ No custom command found for `{trigger}`."), ephemeral=True)

@bot.tree.command(name="list-commands", description="💬 List all custom auto-responder triggers in this server.")
@has_required_slash_role()
async def list_commands_slash(interaction: discord.Interaction):
    rows = list_custom_commands(interaction.guild.id)
    if not rows:
        await interaction.response.send_message(embed=quick_embed("📋 No custom commands set up yet. Use `/new-command` to add one."))
        return
    lines = [f"**{trig}** → {resp}" for trig, resp in rows[:25]]
    embed = discord.Embed(title="💬 Custom Commands", description="\n".join(lines), color=discord.Color.blurple())
    if len(rows) > 25:
        embed.set_footer(text=f"...and {len(rows) - 25} more.")
    await interaction.response.send_message(embed=embed)

def main():
    token = os.getenv("DISCORD_TOKEN") or os.getenv("BOT_TOKEN")
    if not token:
        print("❌ CRITICAL ERROR: DISCORD_TOKEN or BOT_TOKEN environment variable is missing!")
        sys.exit(1)

    # Only expose the lightweight keepalive server when the host provides a
    # web-service port. Background workers can run the bot without it.
    if os.getenv("PORT"):
        Thread(target=run_server, daemon=True).start()

    bot.run(token)


if __name__ == "__main__":
    main()

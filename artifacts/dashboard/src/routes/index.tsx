import { createFileRoute, Link } from '@tanstack/react-router'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import {
  Music,
  Shield,
  TrendingUp,
  Ticket,
  Smile,
  Terminal,
  FileText,
  MessageSquare,
  Check,
  Star,
  Zap,
  ChevronRight,
} from 'lucide-react'
import { CinematicBackground } from '@/components/CinematicBackground'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

/* ─── tiny helpers ─────────────────────────────────────────────────── */
function GradientText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={className}
      style={{
        background: 'linear-gradient(135deg, #ff4da6 0%, #c026d3 50%, #a855f7 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      {children}
    </span>
  )
}

function BunnyLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <ellipse cx="16" cy="22" rx="10" ry="8" fill="#e879f9" />
      {/* left ear */}
      <ellipse cx="10" cy="10" rx="3" ry="7" fill="#e879f9" />
      <ellipse cx="10" cy="10" rx="1.5" ry="5" fill="#f0abfc" />
      {/* right ear */}
      <ellipse cx="22" cy="10" rx="3" ry="7" fill="#e879f9" />
      <ellipse cx="22" cy="10" rx="1.5" ry="5" fill="#f0abfc" />
      {/* face */}
      <ellipse cx="16" cy="22" rx="8" ry="6" fill="#f5d0fe" />
      <circle cx="13" cy="21" r="1.2" fill="#4c1d95" />
      <circle cx="19" cy="21" r="1.2" fill="#4c1d95" />
      <ellipse cx="16" cy="23.5" rx="1.5" ry="1" fill="#f472b6" />
    </svg>
  )
}

/* ─── nav ─────────────────────────────────────────────────────────── */
function Navbar() {
  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 h-14"
      style={{ background: 'rgba(7,7,18,0.75)', backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* logo */}
      <div className="flex items-center gap-2 font-bold text-white text-base select-none">
        <BunnyLogo size={26} />
        United Bunnies
      </div>

      {/* nav links */}
      <nav className="hidden md:flex items-center gap-8 text-sm text-white/60">
        <a href="#features" className="hover:text-white transition-colors">Features</a>
        <a href="#commands" className="hover:text-white transition-colors">Commands</a>
        <a href="#support" className="hover:text-white transition-colors">Support</a>
      </nav>

      {/* actions */}
      <div className="flex items-center gap-3">
        <Link
          to="/login"
          className="text-sm text-white/70 hover:text-white transition-colors px-3 py-1.5"
        >
          Login
        </Link>
        <a
          href="https://discord.com/oauth2/authorize"
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-lg text-white transition-all hover:brightness-110 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #e91e8c, #a855f7)' }}
        >
          Add to Discord
        </a>
      </div>
    </motion.header>
  )
}

/* ─── hero ─────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative min-h-dvh flex flex-col items-center justify-center text-center px-6 pt-14 overflow-hidden">
      <CinematicBackground />

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full text-xs font-semibold text-white/80 border"
          style={{ background: 'rgba(233,30,140,0.12)', borderColor: 'rgba(233,30,140,0.35)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
          V2.0 IS NOW LIVE
        </motion.div>

        {/* headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.05] mb-6"
        >
          Meet{' '}
          <GradientText>United</GradientText>
          <br />
          <GradientText>Bunnies</GradientText>
        </motion.h1>

        {/* tagline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.5 }}
          className="text-base md:text-lg text-white/60 max-w-md mx-auto leading-relaxed mb-10"
        >
          The cutest, most powerful Discord bot in the warren. Level up your community with cozy vibes and serious moderation.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48, duration: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="https://discord.com/oauth2/authorize"
            className="flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-white text-sm shadow-lg transition-all hover:brightness-110 hover:-translate-y-0.5 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #e91e8c, #a855f7)', boxShadow: '0 0 32px rgba(233,30,140,0.4)' }}
          >
            Add to Discord
          </a>
          <Link
            to="/login"
            className="flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-white text-sm border transition-all hover:bg-white/10 hover:-translate-y-0.5 active:scale-95"
            style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)' }}
          >
            View Dashboard
            <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* mouse hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-12 text-xs text-white/30 tracking-wide"
        >
          🐾 Move your mouse — the bunnies will follow! Click to summon more! 🐾
        </motion.p>
      </div>

      {/* scroll gradient */}
      <div
        className="absolute bottom-0 inset-x-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #070712)' }}
      />
    </section>
  )
}

/* ─── features ─────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: Music, label: 'Music', desc: 'Zero-lag streaming from YouTube, Spotify & more. Full queue control.' },
  { icon: Shield, label: 'Moderation', desc: 'Auto-mod, logs, temp bans, slow-mode — enterprise-grade in one click.' },
  { icon: TrendingUp, label: 'Leveling', desc: 'Customisable XP cards, role rewards, and leaderboards your members will grind for.' },
  { icon: Ticket, label: 'Tickets', desc: 'Sleek support ticket panels with staff assignment and private threads.' },
  { icon: Smile, label: 'Reaction Roles', desc: 'Beautiful embed panels that let members self-assign roles instantly.' },
  { icon: Terminal, label: 'Custom Commands', desc: 'Build your own slash commands with no code — just set trigger + response.' },
  { icon: FileText, label: 'Logging', desc: 'Detailed audit logs for every action. Never miss what happened in your server.' },
  { icon: MessageSquare, label: 'Welcome', desc: 'Personalised welcome cards and DMs that greet new members with style.' },
]

function FeatureCard({ icon: Icon, label, desc, index }: { icon: typeof Music; label: string; desc: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group relative rounded-2xl p-6 border transition-all hover:-translate-y-1"
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      {/* glow on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 0%, rgba(233,30,140,0.08) 0%, transparent 70%)' }}
      />
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: 'linear-gradient(135deg, rgba(233,30,140,0.25), rgba(168,85,247,0.25))' }}
      >
        <Icon className="w-5 h-5" style={{ color: '#f472b6' }} />
      </div>
      <h3 className="font-bold text-white mb-1.5 text-sm">{label}</h3>
      <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
    </motion.div>
  )
}

function FeaturesSection() {
  return (
    <section id="features" className="relative py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
            Everything you need
          </h2>
          <p className="text-white/50 max-w-md mx-auto text-sm leading-relaxed">
            Don't let the cute ears fool you. United Bunnies is packed with enterprise-grade features to manage any community.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.label} {...f} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── commands ─────────────────────────────────────────────────────── */
const COMMANDS_HIGHLIGHTS = [
  'Zero-lag music streaming',
  'One-click moderation',
  'Customisable leveling cards',
  'Slash command builder',
  'Auto-mod filters & spam protection',
  'Multi-panel reaction roles',
  'Private ticket threads',
  'Welcome DMs & banners',
]

function CommandsSection() {
  return (
    <section id="commands" className="relative py-28 px-6">
      {/* subtle bg accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 10% 50%, rgba(168,85,247,0.06) 0%, transparent 70%)' }}
      />
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        {/* left copy */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-semibold text-pink-400 uppercase tracking-widest">150+ commands</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
            Powerful<br />Commands
          </h2>
          <p className="text-white/50 text-sm leading-relaxed mb-8 max-w-sm">
            Over 150+ commands designed to be intuitive and fast. Switch between slash commands or traditional prefixes seamlessly.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white text-sm border transition-all hover:bg-white/10"
            style={{ borderColor: 'rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.05)' }}
          >
            Open Dashboard <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* right list */}
        <motion.ul
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3"
        >
          {COMMANDS_HIGHLIGHTS.map((item, i) => (
            <motion.li
              key={item}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="flex items-center gap-3 text-sm text-white/75"
            >
              <span
                className="flex-none w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(233,30,140,0.18)' }}
              >
                <Check className="w-3 h-3 text-pink-400" />
              </span>
              {item}
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}

/* ─── stats ─────────────────────────────────────────────────────────── */
function StatsSection() {
  const stats = [
    { value: '150+', label: 'Commands' },
    { value: '10k+', label: 'Servers' },
    { value: '99.9%', label: 'Uptime' },
    { value: '24/7', label: 'Support' },
  ]

  return (
    <section className="relative py-16 px-6">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, rgba(233,30,140,0.04) 0%, rgba(168,85,247,0.04) 100%)' }}
      />
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
          >
            <div
              className="text-4xl font-extrabold mb-1"
              style={{
                background: 'linear-gradient(135deg, #f472b6, #a855f7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {s.value}
            </div>
            <div className="text-xs text-white/40 uppercase tracking-widest font-medium">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/* ─── cta ───────────────────────────────────────────────────────────── */
function CtaSection() {
  return (
    <section id="support" className="py-20 px-6">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl p-12 text-center overflow-hidden border"
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          {/* inner glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(233,30,140,0.12) 0%, transparent 70%)' }}
          />

          <Zap className="w-8 h-8 mx-auto mb-5 text-pink-400" />
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Ready to hop in?</h2>
          <p className="text-white/50 text-sm mb-8">
            Join thousands of servers already using United Bunnies to build better communities.
          </p>
          <a
            href="https://discord.com/oauth2/authorize"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white text-sm transition-all hover:brightness-110 hover:-translate-y-0.5 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #e91e8c, #a855f7)',
              boxShadow: '0 0 40px rgba(233,30,140,0.35)',
            }}
          >
            Add United Bunnies
          </a>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── footer ────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer
      className="px-6 md:px-12 py-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/35"
      style={{ borderColor: 'rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center gap-2 font-semibold text-white/50">
        <BunnyLogo size={18} />
        United Bunnies
      </div>
      <p>Made with 🤍 by the United Bunnies Team.</p>
      <div className="flex items-center gap-5">
        <a href="#" className="hover:text-white/70 transition-colors">Terms</a>
        <a href="#" className="hover:text-white/70 transition-colors">Privacy</a>
        <a href="https://discord.gg/" className="hover:text-white/70 transition-colors">Discord Server</a>
      </div>
    </footer>
  )
}

/* ─── page ──────────────────────────────────────────────────────────── */
function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-hidden" style={{ background: '#070712', color: 'white' }}>
      <Navbar />
      <Hero />
      <FeaturesSection />
      <StatsSection />
      <CommandsSection />
      <CtaSection />
      <Footer />
    </div>
  )
}

import { motion } from 'framer-motion'

/* ─── side-view walking bunny SVG ─────────────────────────────────── */
function WalkingBunny({ delay = 0, scale = 1 }: { delay?: number; scale?: number }) {
  return (
    <motion.div
      style={{ display: 'inline-block', transformOrigin: 'bottom center', scale }}
      animate={{
        y: [0, -14, 0, -14, 0],
        rotate: [0, -2, 0, 2, 0],
      }}
      transition={{
        duration: 0.72,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        {/* tail */}
        <motion.ellipse
          cx="8" cy="36" rx="5" ry="4"
          fill="white" opacity={0.85}
          animate={{ scaleX: [1, 1.15, 1], scaleY: [1, 0.85, 1] }}
          transition={{ duration: 0.36, delay, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* body */}
        <ellipse cx="26" cy="36" rx="16" ry="12" fill="#d946ef" />
        {/* head */}
        <ellipse cx="40" cy="26" rx="11" ry="10" fill="#e879f9" />
        {/* left ear */}
        <motion.g
          animate={{ rotate: [-4, 6, -4] }}
          transition={{ duration: 0.72, delay, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '36px 18px' }}
        >
          <ellipse cx="36" cy="11" rx="3.5" ry="9" fill="#e879f9" />
          <ellipse cx="36" cy="11" rx="1.8" ry="6.5" fill="#f0abfc" />
        </motion.g>
        {/* right ear */}
        <motion.g
          animate={{ rotate: [4, -6, 4] }}
          transition={{ duration: 0.72, delay, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '43px 18px' }}
        >
          <ellipse cx="43" cy="11" rx="3.5" ry="9" fill="#e879f9" />
          <ellipse cx="43" cy="11" rx="1.8" ry="6.5" fill="#f0abfc" />
        </motion.g>
        {/* eye */}
        <circle cx="46" cy="25" r="2" fill="#581c87" />
        <circle cx="47" cy="24" r="0.7" fill="white" />
        {/* nose */}
        <ellipse cx="51" cy="28" rx="1.5" ry="1" fill="#f472b6" />
        {/* cheek blush */}
        <ellipse cx="46" cy="29" rx="3" ry="1.5" fill="#f472b6" opacity={0.35} />
        {/* front legs */}
        <motion.ellipse
          cx="38" cy="47" rx="5" ry="3"
          fill="#c026d3"
          animate={{ y: [0, -5, 0], x: [0, 2, 0] }}
          transition={{ duration: 0.36, delay: delay + 0.0, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.ellipse
          cx="30" cy="47" rx="5" ry="3"
          fill="#c026d3"
          animate={{ y: [0, -5, 0], x: [0, -2, 0] }}
          transition={{ duration: 0.36, delay: delay + 0.18, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* back legs */}
        <motion.ellipse
          cx="18" cy="47" rx="5" ry="3"
          fill="#a21caf"
          animate={{ y: [0, -4, 0], x: [0, 2, 0] }}
          transition={{ duration: 0.36, delay: delay + 0.09, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.ellipse
          cx="10" cy="47" rx="5" ry="3"
          fill="#a21caf"
          animate={{ y: [0, -4, 0], x: [0, -2, 0] }}
          transition={{ duration: 0.36, delay: delay + 0.27, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
    </motion.div>
  )
}

/* ─── paw print ────────────────────────────────────────────────────── */
function PawPrint({ x, delay }: { x: number; delay: number }) {
  return (
    <motion.div
      className="absolute bottom-6"
      style={{ left: x }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: [0, 0.4, 0], scale: [0.5, 1, 1] }}
      transition={{ duration: 1.2, delay, repeat: Infinity, repeatDelay: 2.4 }}
    >
      <svg width="14" height="14" viewBox="0 0 20 20" fill="#f472b6" opacity={0.6}>
        <circle cx="6" cy="4" r="2.5" />
        <circle cx="14" cy="4" r="2.5" />
        <circle cx="3" cy="9" r="2" />
        <circle cx="17" cy="9" r="2" />
        <ellipse cx="10" cy="15" rx="5" ry="4" />
      </svg>
    </motion.div>
  )
}

/* ─── loading dots ─────────────────────────────────────────────────── */
function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: '#f472b6' }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 0.9, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

/* ─── full-screen loader ────────────────────────────────────────────── */
export function BunnyLoader() {
  return (
    <motion.div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center"
      style={{ background: '#070712' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(168,85,247,0.12) 0%, transparent 70%)',
        }}
      />

      {/* bunny parade */}
      <div className="relative flex items-end gap-6 mb-8">
        {/* paw prints */}
        {[40, 100, 160, 220, 280].map((x, i) => (
          <PawPrint key={x} x={x} delay={i * 0.5} />
        ))}

        <WalkingBunny delay={0.0} scale={0.8} />
        <WalkingBunny delay={0.18} scale={1.0} />
        <WalkingBunny delay={0.36} scale={0.85} />
      </div>

      {/* logo + label */}
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-base font-bold"
            style={{
              background: 'linear-gradient(135deg, #f472b6, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            United Bunnies
          </span>
          <LoadingDots />
        </div>
        <p className="text-xs text-white/30 tracking-widest uppercase">hopping along</p>
      </motion.div>
    </motion.div>
  )
}

/* ─── inline mini loader (for suspense boundaries inside pages) ─────── */
export function BunnySpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="flex items-end gap-3">
        <WalkingBunny delay={0} scale={0.65} />
        <WalkingBunny delay={0.18} scale={0.8} />
        <WalkingBunny delay={0.36} scale={0.65} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-white/40">{label}</span>
        <LoadingDots />
      </div>
    </div>
  )
}

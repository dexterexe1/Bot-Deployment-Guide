/**
 * CustomCursor — a polished bunny cursor that replaces the system cursor.
 *
 * Features:
 *  - Spring-physics following (smooth, slightly lagged secondary ring)
 *  - Scales up on hoverable elements (a, button, [role=button], label, etc.)
 *  - Click burst: 6 tiny hearts/sparkles fly out on mousedown
 *  - Three variants: bunny | bunny-glow (adds bloom filter) | bunny-large
 *  - Fully configurable color
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion'

/* ─── types ─────────────────────────────────────────────────────────── */
export type CursorType = 'bunny' | 'bunny-glow' | 'bunny-large'

export interface CustomCursorProps {
  enabled?: boolean
  cursorType?: CursorType
  cursorColor?: string
}

/* ─── helpers ────────────────────────────────────────────────────────── */
const HOVER_SELECTOR =
  'a, button, [role="button"], label, input[type="checkbox"], input[type="radio"], select, [data-cursor-hover]'

interface Sparkle {
  id: number
  x: number
  y: number
  angle: number
}

/* ─── bunny SVG face ─────────────────────────────────────────────────── */
function BunnyCursorSvg({
  size,
  color,
  glow,
}: {
  size: number
  color: string
  glow: boolean
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      style={{
        filter: glow
          ? `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 14px ${color})`
          : `drop-shadow(0 2px 6px rgba(0,0,0,0.5))`,
        transition: 'filter 0.2s ease',
      }}
    >
      {/* left ear */}
      <ellipse cx="22" cy="14" rx="6" ry="14" fill={color} opacity={0.9} />
      <ellipse cx="22" cy="14" rx="3" ry="10" fill="white" opacity={0.35} />
      {/* right ear */}
      <ellipse cx="42" cy="14" rx="6" ry="14" fill={color} opacity={0.9} />
      <ellipse cx="42" cy="14" rx="3" ry="10" fill="white" opacity={0.35} />
      {/* face */}
      <circle cx="32" cy="40" r="20" fill={color} />
      {/* cheek blush */}
      <ellipse cx="22" cy="44" rx="5" ry="3" fill="white" opacity={0.18} />
      <ellipse cx="42" cy="44" rx="5" ry="3" fill="white" opacity={0.18} />
      {/* eyes */}
      <circle cx="25" cy="37" r="3.5" fill="white" />
      <circle cx="39" cy="37" r="3.5" fill="white" />
      <circle cx="26" cy="37" r="2" fill="#1e1b4b" />
      <circle cx="40" cy="37" r="2" fill="#1e1b4b" />
      {/* eye shine */}
      <circle cx="27" cy="36" r="0.8" fill="white" />
      <circle cx="41" cy="36" r="0.8" fill="white" />
      {/* nose */}
      <ellipse cx="32" cy="44" rx="3" ry="2" fill="white" opacity={0.7} />
      {/* mouth */}
      <path d="M29 47 Q32 50 35 47" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity={0.5} />
    </svg>
  )
}

/* ─── sparkle ────────────────────────────────────────────────────────── */
function SparkleParticle({ sparkle, color }: { sparkle: Sparkle; color: string }) {
  const dx = Math.cos(sparkle.angle) * 28
  const dy = Math.sin(sparkle.angle) * 28

  return (
    <motion.div
      key={sparkle.id}
      className="pointer-events-none fixed z-[10001]"
      style={{ left: sparkle.x, top: sparkle.y, translateX: '-50%', translateY: '-50%' }}
      initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      animate={{ opacity: 0, x: dx, y: dy, scale: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
    >
      {/* tiny heart ♥ */}
      <svg width="10" height="10" viewBox="0 0 20 20" fill={color}>
        <path d="M10 17s-7-4.35-7-9A4 4 0 0 1 10 5.5 4 4 0 0 1 17 8c0 4.65-7 9-7 9z" />
      </svg>
    </motion.div>
  )
}

/* ─── main component ─────────────────────────────────────────────────── */
export function CustomCursor({
  enabled = true,
  cursorType = 'bunny-glow',
  cursorColor = 'rgba(139, 92, 246, 0.92)',
}: CustomCursorProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([])
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(false)
  const sparkleId = useRef(0)

  /* exact mouse position */
  const mx = useMotionValue(-200)
  const my = useMotionValue(-200)

  /* spring-lagged secondary ring */
  const rx = useSpring(mx, { stiffness: 120, damping: 18, mass: 0.6 })
  const ry = useSpring(my, { stiffness: 120, damping: 18, mass: 0.6 })

  const size = cursorType === 'bunny-large' ? 52 : cursorType === 'bunny-glow' ? 38 : 30
  const glow = cursorType === 'bunny-glow'
  const ringSize = size + 18

  /* mouse tracking */
  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      mx.set(e.clientX)
      my.set(e.clientY)
      if (!visible) setVisible(true)
    },
    [mx, my, visible],
  )

  /* hover detection */
  const onMouseOver = useCallback((e: MouseEvent) => {
    if ((e.target as Element).closest(HOVER_SELECTOR)) setHovered(true)
  }, [])
  const onMouseOut = useCallback((e: MouseEvent) => {
    if ((e.target as Element).closest(HOVER_SELECTOR)) setHovered(false)
  }, [])

  /* click sparkles */
  const onMouseDown = useCallback(
    (e: MouseEvent) => {
      const count = 6
      const newSparkles: Sparkle[] = Array.from({ length: count }, (_, i) => ({
        id: ++sparkleId.current,
        x: e.clientX,
        y: e.clientY,
        angle: (i / count) * Math.PI * 2,
      }))
      setSparkles((prev) => [...prev, ...newSparkles])
      setTimeout(() => {
        setSparkles((prev) => prev.filter((s) => !newSparkles.find((n) => n.id === s.id)))
      }, 700)
    },
    [],
  )

  const onMouseLeave = useCallback(() => setVisible(false), [])
  const onMouseEnter = useCallback(() => setVisible(true), [])

  useEffect(() => {
    if (!enabled) return
    /* hide system cursor */
    document.documentElement.style.cursor = 'none'

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseover', onMouseOver)
    window.addEventListener('mouseout', onMouseOut)
    window.addEventListener('mousedown', onMouseDown)
    document.documentElement.addEventListener('mouseleave', onMouseLeave)
    document.documentElement.addEventListener('mouseenter', onMouseEnter)

    return () => {
      document.documentElement.style.cursor = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseover', onMouseOver)
      window.removeEventListener('mouseout', onMouseOut)
      window.removeEventListener('mousedown', onMouseDown)
      document.documentElement.removeEventListener('mouseleave', onMouseLeave)
      document.documentElement.removeEventListener('mouseenter', onMouseEnter)
    }
  }, [enabled, onMouseMove, onMouseOver, onMouseOut, onMouseDown, onMouseLeave, onMouseEnter])

  if (!enabled) return null

  return (
    <>
      {/* ── spring ring (follows with lag) ── */}
      <motion.div
        className="pointer-events-none fixed z-[9998]"
        style={{
          x: rx,
          y: ry,
          translateX: '-50%',
          translateY: '-50%',
          opacity: visible ? 1 : 0,
        }}
      >
        <motion.div
          animate={{ scale: hovered ? 1.5 : 1, opacity: hovered ? 0.6 : 0.3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{
            width: ringSize,
            height: ringSize,
            borderRadius: '50%',
            border: `1.5px solid ${cursorColor}`,
            boxShadow: glow ? `0 0 12px ${cursorColor}` : 'none',
          }}
        />
      </motion.div>

      {/* ── bunny cursor (exact position) ── */}
      <motion.div
        className="pointer-events-none fixed z-[9999]"
        style={{
          x: mx,
          y: my,
          translateX: '-50%',
          translateY: '-50%',
          opacity: visible ? 1 : 0,
        }}
      >
        <motion.div
          animate={{ scale: hovered ? 1.3 : 1, rotate: hovered ? -12 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        >
          <BunnyCursorSvg size={size} color={cursorColor} glow={glow} />
        </motion.div>
      </motion.div>

      {/* ── sparkle burst on click ── */}
      <AnimatePresence>
        {sparkles.map((s) => (
          <SparkleParticle key={s.id} sparkle={s} color={cursorColor} />
        ))}
      </AnimatePresence>
    </>
  )
}

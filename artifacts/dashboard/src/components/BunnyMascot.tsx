import { motion } from 'framer-motion'

interface BunnyMascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
  glow?: boolean
  className?: string
}

export function BunnyMascot({ size = 'md', animated = true, glow = false, className = '' }: BunnyMascotProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-48 h-48',
  }

  return (
    <motion.div
      className={`relative ${sizeClasses[size]} ${className}`}
      animate={
        animated
          ? {
              y: [0, -8, 0],
              scale: [1, 1.02, 1],
            }
          : {}
      }
      transition={
        animated
          ? {
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }
          : {}
      }
    >
      {/* Glow Effect */}
      {glow && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 blur-xl" />
      )}

      {/* Bunny SVG */}
      <motion.svg
        viewBox="0 0 100 100"
        className="relative w-full h-full drop-shadow-lg"
        initial={false}
      >
        {/* Ears */}
        <motion.g
          animate={
            animated
              ? {
                  rotate: [-2, 2, -2],
                }
              : {}
          }
          transition={
            animated
              ? {
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
              : {}
          }
          style={{ transformOrigin: 'center 40px' }}
        >
          {/* Left Ear */}
          <ellipse
            cx="35"
            cy="25"
            rx="8"
            ry="20"
            className="fill-violet-400"
            transform="rotate(-15 35 25)"
          />
          <ellipse
            cx="35"
            cy="25"
            rx="5"
            ry="14"
            className="fill-pink-300"
            transform="rotate(-15 35 25)"
          />
          {/* Right Ear */}
          <ellipse
            cx="65"
            cy="25"
            rx="8"
            ry="20"
            className="fill-violet-400"
            transform="rotate(15 65 25)"
          />
          <ellipse
            cx="65"
            cy="25"
            rx="5"
            ry="14"
            className="fill-pink-300"
            transform="rotate(15 65 25)"
          />
        </motion.g>

        {/* Head */}
        <motion.circle
          cx="50"
          cy="55"
          r="30"
          className="fill-violet-500"
          animate={
            animated
              ? {
                  scaleY: [1, 1.02, 1],
                }
              : {}
          }
          transition={
            animated
              ? {
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
              : {}
          }
          style={{ transformOrigin: 'center center' }}
        />

        {/* Face gradient overlay */}
        <circle cx="50" cy="55" r="30" className="fill-transparent stroke-violet-400/30" strokeWidth="2" />

        {/* Eyes */}
        <motion.g
          animate={
            animated
              ? {
                  scaleY: [1, 0.1, 1],
                }
              : {}
          }
          transition={
            animated
              ? {
                  duration: 4,
                  repeat: Infinity,
                  times: [0, 0.05, 0.1],
                }
              : {}
          }
          style={{ transformOrigin: 'center 48px' }}
        >
          <circle cx="40" cy="48" r="4" className="fill-white" />
          <circle cx="40" cy="48" r="2" className="fill-slate-900" />
          <circle cx="60" cy="48" r="4" className="fill-white" />
          <circle cx="60" cy="48" r="2" className="fill-slate-900" />
        </motion.g>

        {/* Nose */}
        <motion.ellipse
          cx="50"
          cy="58"
          rx="3"
          ry="2"
          className="fill-pink-400"
          animate={
            animated
              ? {
                  scale: [1, 1.1, 1],
                }
              : {}
          }
          transition={
            animated
              ? {
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
              : {}
          }
        />

        {/* Mouth */}
        <path
          d="M 45 62 Q 50 66 55 62"
          className="stroke-pink-400 fill-none"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Cheeks */}
        <circle cx="32" cy="58" r="5" className="fill-pink-400/30" />
        <circle cx="68" cy="58" r="5" className="fill-pink-400/30" />

        {/* Floating Particles around mascot */}
        {animated && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.circle
                key={i}
                cx={20 + Math.random() * 60}
                cy={20 + Math.random() * 60}
                r={1 + Math.random() * 2}
                className="fill-violet-300/60"
                animate={{
                  y: [0, -15, 0],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
          </>
        )}
      </motion.svg>
    </motion.div>
  )
}

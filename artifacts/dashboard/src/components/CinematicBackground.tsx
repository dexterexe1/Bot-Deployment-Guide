import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { BackgroundConfig } from '../types/customization'
import { DEFAULT_BACKGROUND_CONFIG } from '../types/customization'

interface Particle {
  id: number
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
}

interface BunnySilhouette {
  id: number
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  rotation: number
  rotationSpeed: number
  opacity: number
}

interface CinematicBackgroundProps {
  config?: Partial<BackgroundConfig>
}

export function CinematicBackground({ config }: CinematicBackgroundProps) {
  // Merge user config with defaults — memoised so the object reference is stable
  // and the initialisation effect doesn't run on every render.
  const bgConfig = useMemo(
    () => ({ ...DEFAULT_BACKGROUND_CONFIG, ...config }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(config)],
  )
  
  const containerRef = useRef<HTMLDivElement>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const [bunnySilhouettes, setBunnySilhouettes] = useState<BunnySilhouette[]>([])
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    // Generate small glowing particles
    const newParticles: Particle[] = []
    for (let i = 0; i < bgConfig.particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * (bgConfig.particleSizeMax - bgConfig.particleSizeMin) + bgConfig.particleSizeMin,
        speedX: (Math.random() - 0.5) * 0.01,
        speedY: (Math.random() - 0.5) * 0.01,
        opacity: Math.random() * bgConfig.particleOpacity,
      })
    }
    setParticles(newParticles)

    // Generate constellation-style bunny silhouettes
    const newBunnies: BunnySilhouette[] = []
    for (let i = 0; i < bgConfig.bunnyCount; i++) {
      newBunnies.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * (bgConfig.bunnySizeMax - bgConfig.bunnySizeMin) + bgConfig.bunnySizeMin,
        speedX: (Math.random() - 0.5) * 0.005,
        speedY: (Math.random() - 0.5) * 0.005,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        opacity: Math.random() * bgConfig.bunnyOpacity, // Very low opacity
      })
    }
    setBunnySilhouettes(newBunnies)
  }, [bgConfig])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setMousePos({
          x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
          y: ((e.clientY - rect.top) / rect.height) * 2 - 1,
        })
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Animate particles and bunnies
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev =>
        prev.map(p => ({
          ...p,
          x: ((p.x + p.speedX * 100 + 100) % 100),
          y: ((p.y + p.speedY * 100 + 100) % 100),
        }))
      )
      setBunnySilhouettes(prev =>
        prev.map(b => ({
          ...b,
          x: ((b.x + b.speedX * 100 + 100) % 100),
          y: ((b.y + b.speedY * 100 + 100) % 100),
          rotation: b.rotation + b.rotationSpeed,
        }))
      )
    }, 50)

    return () => clearInterval(interval)
  }, [])

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Aurora Background */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{
          transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px)`,
        }}
      >
        <div 
          className="absolute inset-0" 
          style={{ background: `radial-gradient(ellipse at top left, ${bgConfig.auroraColor1}, transparent)` }} 
        />
        <div 
          className="absolute inset-0" 
          style={{ background: `radial-gradient(ellipse at top right, ${bgConfig.auroraColor2}, transparent)` }} 
        />
        <div 
          className="absolute inset-0" 
          style={{ background: `radial-gradient(ellipse at bottom left, ${bgConfig.auroraColor3}, transparent)` }} 
        />
        <div 
          className="absolute inset-0" 
          style={{ background: `radial-gradient(ellipse at bottom right, ${bgConfig.auroraColor4}, transparent)` }} 
        />
        
        {/* Dynamic lighting following mouse */}
        <div
          className="absolute inset-0 transition-all duration-500"
          style={{
            background: `radial-gradient(circle at ${50 + mousePos.x * 20}% ${50 + mousePos.y * 20}%, rgba(139, 92, 246, 0.18) 0%, transparent 50%)`,
          }}
        />
      </div>

      {/* Floating Glowing Particles */}
      {particles.map(particle => (
        <motion.div
          key={`particle-${particle.id}`}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
            background: 'rgba(139, 92, 246, 0.8)',
            boxShadow: '0 0 8px rgba(139, 92, 246, 0.6), 0 0 16px rgba(139, 92, 246, 0.3)',
          }}
          animate={{
            y: [0, -6, 0],
            scale: [1, 1.2, 1],
            opacity: [particle.opacity * 0.5, particle.opacity, particle.opacity * 0.5],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: particle.id * 0.05,
          }}
        />
      ))}

      {/* Constellation-style Bunny Silhouettes */}
      {bunnySilhouettes.map(bunny => (
        <motion.div
          key={`bunny-${bunny.id}`}
          className="absolute"
          style={{
            left: `${bunny.x}%`,
            top: `${bunny.y}%`,
            width: bunny.size,
            height: bunny.size,
            opacity: bunny.opacity,
            transform: `rotate(${bunny.rotation}deg)`,
          }}
          animate={{
            y: [0, -15, 0],
            opacity: [bunny.opacity * 0.5, bunny.opacity, bunny.opacity * 0.5],
          }}
          transition={{
            duration: 8 + Math.random() * 4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: bunny.id * 0.2,
          }}
        >
          {/* Neon Outline Bunny SVG */}
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            style={{
              filter: `drop-shadow(0 0 10px ${bgConfig.bunnyColor}) drop-shadow(0 0 20px ${bgConfig.bunnyColor})`,
            }}
          >
            {/* Head Outline */}
            <circle
              cx="50"
              cy="55"
              r="28"
              fill="none"
              stroke={bgConfig.bunnyColor}
              strokeWidth="1.5"
            />
            {/* Left Ear Outline */}
            <ellipse
              cx="36"
              cy="28"
              rx="7"
              ry="18"
              fill="none"
              stroke={bgConfig.bunnyColor}
              strokeWidth="1.5"
              transform="rotate(-15 36 28)"
            />
            {/* Right Ear Outline */}
            <ellipse
              cx="64"
              cy="28"
              rx="7"
              ry="18"
              fill="none"
              stroke={bgConfig.bunnyColor}
              strokeWidth="1.5"
              transform="rotate(15 64 28)"
            />
            {/* Constellation Stars (dots) */}
            {[
              { x: 50, y: 55 }, // Center of head
              { x: 36, y: 28 }, // Left ear
              { x: 64, y: 28 }, // Right ear
              { x: 32, y: 55 }, // Left cheek
              { x: 68, y: 55 }, // Right cheek
              { x: 50, y: 75 }, // Bottom of head
              { x: 40, y: 45 }, // Left eye
              { x: 60, y: 45 }, // Right eye
            ].map((star, i) => (
              <circle
                key={i}
                cx={star.x}
                cy={star.y}
                r="2.5"
                fill={bgConfig.bunnyColor}
              />
            ))}
          </svg>
        </motion.div>
      ))}

      {/* Glass Reflection Overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `linear-gradient(${135 + mousePos.x * 20}deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)`,
        }}
      />
    </div>
  )
}

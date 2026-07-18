import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CinematicBackground } from '@/components/CinematicBackground'
import { BunnyMascot } from '@/components/BunnyMascot'

export const Route = createFileRoute('/auth/callback')({
  head: () => ({
    meta: [
      { title: 'Authenticating... · United Bunnies' },
    ],
  }),
  component: AuthCallback,
})

function AuthCallback() {
  const [loadingStage] = useState<'connecting' | 'loading'>('connecting')

  useEffect(() => {
    // Discord now redirects directly to the API for token exchange.
    // This route is only visited if someone navigates here manually — just
    // send them to login.
    setTimeout(() => {
      window.location.href = '/login'
    }, 500)
  }, [])

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <CinematicBackground />
      
      <div className="relative flex min-h-dvh items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <BunnyMascot size="xl" animated glow />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <h2 className="text-2xl font-semibold text-white">
              {loadingStage === 'connecting' ? 'Connecting to Discord...' : 'Loading your server...'}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {loadingStage === 'connecting' ? 'Establishing secure connection' : 'Preparing your dashboard'}
            </p>
          </motion.div>

          <motion.div
            className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden"
            initial={{ opacity: 0, width: 150 }}
            animate={{ opacity: 1, width: 192 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-blue-500"
              initial={{ width: '0%' }}
              animate={{ width: loadingStage === 'connecting' ? '50%' : '100%' }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
            />
          </motion.div>

          {/* Floating particles around bunny */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-violet-400/60"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${20 + Math.random() * 60}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

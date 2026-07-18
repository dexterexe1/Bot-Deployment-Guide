import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DiscordLogo } from '@/features/application/components/DiscordLogo'
import { CinematicBackground } from '@/components/CinematicBackground'
import { useState } from 'react'

export const Route = createFileRoute('/login')({
  head: () => ({
    meta: [
      { title: 'Login · United Bunnies' },
      { name: 'description', content: 'Sign in to manage your Discord server dashboard.' },
    ],
  }),
  component: LoginPage,
})

function LoginPage() {
  const [isConnecting, setIsConnecting] = useState(false)

  const handleLogin = () => {
    setIsConnecting(true)
    // Delay redirect slightly to show animation
    setTimeout(() => {
      window.location.href = '/api/v1/auth/discord/login'
    }, 2000)
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* Full-screen Cinematic Background */}
      <CinematicBackground />

      {/* Connecting Overlay */}
      {isConnecting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl"
        >
          <div className="flex flex-col items-center gap-6">
            <motion.div
              className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 animate-pulse"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h2 className="text-2xl font-semibold text-white">Connecting to Discord...</h2>
              <p className="text-sm text-muted-foreground mt-2">Preparing your secure session</p>
            </motion.div>
            <motion.div
              className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-blue-500"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}

      <div className="relative mx-auto flex min-h-dvh max-w-6xl items-center justify-center px-6 py-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <Card className="border-border bg-card/80 backdrop-blur-xl shadow-[0_40px_120px_-70px_rgba(139,92,246,0.5)]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-blue-500" />
                </div>
                <div>
                  <CardTitle>United Bunnies</CardTitle>
                  <CardDescription>Sign in to manage your server dashboard.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleLogin}
                disabled={isConnecting}
                className="h-11 w-full justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:opacity-95 disabled:opacity-50"
              >
                <DiscordLogo className="h-4 w-4 fill-white" />
                Continue with Discord
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Sessions are stored securely on the server.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { apiRequest, isApiError } from '@/lib/api'
import type { SessionUser } from '@/types/application'

export function useAuth() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    apiRequest<{ user: SessionUser }>('/auth/me')
      .then((result) => {
        if (!isApiError(result)) {
          setUser(result.data.user)
        } else {
          setUser(null)
        }
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  return { user, isLoading }
}

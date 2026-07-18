import { createFileRoute, redirect } from '@tanstack/react-router'
import { apiRequest, isApiError } from '@/lib/api'
import type { SessionUser } from '@/types/application'

export const Route = createFileRoute('/')({
  async loader() {
    // Check session — redirect to dashboard if logged in, login page if not.
    const result = await apiRequest<{ user: SessionUser }>('/auth/me')
    if (isApiError(result)) {
      throw redirect({ to: '/login' })
    }
    throw redirect({ to: '/dashboard' })
  },
  component: () => null,
})

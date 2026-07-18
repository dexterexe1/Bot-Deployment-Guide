import type { ReactNode } from 'react'

/**
 * Stub: replaces the Blink-platform SSR boundary with a simple pass-through.
 * No SSR is used in this deployment so all children render normally.
 */
export function BlinkClientBoundary({
  children,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  return <>{children}</>
}

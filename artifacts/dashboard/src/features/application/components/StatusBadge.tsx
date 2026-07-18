import { cn } from '@/lib/utils'
import type { ApplicationStatus, ApplicationSubmissionStatus } from '@/types/application'

const statusStyles: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border-muted',
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  archived: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  pending: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  reviewing: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  accepted: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/30',
  waitlisted: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  withdrawn: 'bg-muted text-muted-foreground border-muted',
}

export function StatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus | ApplicationSubmissionStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize',
        statusStyles[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

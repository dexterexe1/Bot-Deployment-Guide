import { Badge } from '@/components/ui/badge'
import type { ApplicationStatus, ApplicationSubmissionStatus } from '@/types/application'

type Status = ApplicationStatus | ApplicationSubmissionStatus

const CONFIG: Record<string, { label: string; className: string }> = {
  // Form statuses
  draft:      { label: 'Draft',      className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  active:     { label: 'Active',     className: 'bg-green-500/20  text-green-400  border-green-500/30'  },
  archived:   { label: 'Archived',   className: 'bg-gray-500/20   text-gray-400   border-gray-500/30'   },
  // Submission statuses
  pending:    { label: 'Pending',    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  reviewing:  { label: 'Reviewing', className: 'bg-blue-500/20   text-blue-400   border-blue-500/30'   },
  accepted:   { label: 'Accepted',   className: 'bg-green-500/20  text-green-400  border-green-500/30'  },
  rejected:   { label: 'Rejected',   className: 'bg-red-500/20    text-red-400    border-red-500/30'    },
  waitlisted: { label: 'Waitlisted', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  withdrawn:  { label: 'Withdrawn',  className: 'bg-gray-500/20   text-gray-400   border-gray-500/30'   },
}

export function StatusBadge({ status }: { status: Status }) {
  const cfg = CONFIG[status] ?? { label: status, className: '' }
  return (
    <Badge variant="outline" className={`capitalize text-[11px] ${cfg.className}`}>
      {cfg.label}
    </Badge>
  )
}

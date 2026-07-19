import { createFileRoute } from '@tanstack/react-router'
import { TicketsPage } from '@/features/tickets/page'

export const Route = createFileRoute('/_app/guilds/$guildId/tickets')({
  component: TicketsPage,
})

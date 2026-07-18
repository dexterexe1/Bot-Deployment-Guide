import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ApplicationPanelEmbed } from '@/types/application'

function DiscordEmbedPreview({ embed }: { embed: ApplicationPanelEmbed }) {
  const borderColor = embed.color ?? '#5865f2'
  return (
    <div
      className="rounded border-l-4 bg-[#2b2d31] p-3 text-sm shadow"
      style={{ borderLeftColor: borderColor }}
    >
      {embed.title && (
        <div className="mb-1 font-semibold text-white">{embed.title}</div>
      )}
      {embed.description && (
        <div className="mb-2 whitespace-pre-wrap text-[#dbdee1]">{embed.description}</div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#949ba4]">
          {embed.footer ?? 'Click Apply Now to begin'}
        </span>
      </div>
    </div>
  )
}

export function PanelPreview({
  button,
  embed,
}: {
  button: { label: string; style: string; emoji: string | null }
  embed: ApplicationPanelEmbed
}) {
  const buttonStyles: Record<string, string> = {
    primary: 'bg-[#5865f2] hover:bg-[#4752c4] text-white',
    secondary: 'bg-[#4e5058] hover:bg-[#6d6f78] text-white',
    success: 'bg-[#248046] hover:bg-[#1a6334] text-white',
    danger: 'bg-[#da373c] hover:bg-[#a12828] text-white',
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Panel Preview</p>
      <DiscordEmbedPreview embed={embed} />
      <div className="flex items-center gap-2">
        <Button
          disabled
          className={`h-9 rounded px-4 text-sm font-medium ${buttonStyles[button.style] ?? buttonStyles.primary}`}
        >
          {button.emoji && <span className="mr-1">{button.emoji}</span>}
          {button.label}
        </Button>
      </div>
    </div>
  )
}

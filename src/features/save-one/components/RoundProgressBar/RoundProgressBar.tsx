interface RoundProgressBarProps {
  current: number   // 1-indexed (current round being played)
  total: number
  className?: string
}

export function RoundProgressBar({ current, total, className }: RoundProgressBarProps) {
  const pct = Math.round((current / total) * 100)

  return (
    <div className={['flex flex-col gap-1 min-w-[120px]', className].filter(Boolean).join(' ')}>
      <div className="flex items-baseline gap-1">
        <span className="text-kq-muted text-xs font-medium uppercase tracking-wider">Round</span>
        <span className="text-kq-text font-bold text-sm tabular-nums">
          {current}
          <span className="text-kq-muted font-normal text-xs"> / {total}</span>
        </span>
      </div>
      <div className="h-1 rounded-full bg-kq-elevated overflow-hidden">
        <div
          className="h-full rounded-full bg-kq-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

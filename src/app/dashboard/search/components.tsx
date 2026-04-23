export function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  return (
    <span className="text-[10.5px] font-bold tabular-nums text-zinc-400">
      {pct}% 匹配
    </span>
  )
}

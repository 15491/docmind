import { Skeleton } from "@/components/ui/skeleton"
import { CONFIDENCE_LABELS } from "./confidence"
import type { MessageAnalysis } from "./types"

export function AIAvatar() {
  return (
    <div className="bg-muted border-border text-muted-foreground mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px] border">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    </div>
  )
}

type AnalysisSectionProps = {
  analysis?: MessageAnalysis
  pending?: boolean
  animate?: boolean
  onFollowUp: (text: string) => void
}

export function AnalysisSection({ analysis, pending, animate = false, onFollowUp }: AnalysisSectionProps) {
  if (!analysis && !pending) {
    return null
  }

  const className = [
    "border-border bg-muted/40 mt-3.5 rounded-[12px] border p-3",
    animate ? "animate-in fade-in slide-in-from-bottom-1 duration-300" : "",
  ].filter(Boolean).join(" ")

  if (!analysis) {
    return (
      <div className={className}>
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-foreground text-[11px] font-bold">分析结果</span>
          <span className="text-muted-foreground text-[11px]">正在生成</span>
        </div>
        <div className="min-h-[124px]">
          <div className="mb-3">
            <div className="text-muted-foreground mb-1.5 text-[11px] font-semibold">关键信息</div>
            <div className="space-y-1.5">
              <Skeleton className="h-3" />
              <Skeleton className="h-3 w-[92%]" />
              <Skeleton className="h-3 w-[78%]" />
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1.5 text-[11px] font-semibold">建议追问</div>
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-foreground text-[11px] font-bold">分析结果</span>
        <span className="text-muted-foreground text-[11px]">置信度：{CONFIDENCE_LABELS[analysis.confidence]}</span>
      </div>
      {analysis.evidence.length > 0 ? (
        <div className="mb-2.5">
          <div className="text-muted-foreground mb-1 text-[11px] font-semibold">关键证据</div>
          <ul className="text-foreground/80 list-disc space-y-1 pl-4 text-[12px] leading-[1.7]">
            {analysis.evidence.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {analysis.followUp.length > 0 ? (
        <div>
          <div className="text-muted-foreground mb-1 text-[11px] font-semibold">建议追问</div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.followUp.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onFollowUp(item)}
                className="border-border text-muted-foreground hover:bg-background hover:text-foreground rounded-full border px-2.5 py-1 text-[11px] transition-colors"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

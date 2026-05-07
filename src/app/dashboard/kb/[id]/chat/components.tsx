import { CONFIDENCE_LABELS } from "./confidence"
import type { MessageAnalysis } from "./types"

export function AIAvatar() {
  return (
    <div
      className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px]"
      style={{ background: "#f4f4f5", border: "1px solid #e4e4e7" }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-zinc-600"
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
    "mt-3.5 rounded-[12px] border border-[#f0f0f3] bg-[#fafafa] p-3",
    animate ? "animate-in fade-in slide-in-from-bottom-1 duration-300" : "",
  ].filter(Boolean).join(" ")

  if (!analysis) {
    return (
      <div className={className}>
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#62636b]">分析结果</span>
          <span className="text-[11px] text-[#8a8b93]">正在生成</span>
        </div>
        <div className="min-h-[124px]">
          <div className="mb-3">
            <div className="mb-1.5 text-[11px] font-semibold text-[#8a8b93]">关键信息</div>
            <div className="space-y-1.5">
              <div className="h-3 animate-pulse rounded bg-[#ececf1]" />
              <div className="h-3 w-[92%] animate-pulse rounded bg-[#ececf1]" />
              <div className="h-3 w-[78%] animate-pulse rounded bg-[#ececf1]" />
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[11px] font-semibold text-[#8a8b93]">建议追问</div>
            <div className="flex flex-wrap gap-1.5">
              <div className="h-6 w-20 animate-pulse rounded-full bg-[#ececf1]" />
              <div className="h-6 w-24 animate-pulse rounded-full bg-[#ececf1]" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-[#ececf1]" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold text-[#62636b]">分析结果</span>
        <span className="text-[11px] text-[#8a8b93]">置信度：{CONFIDENCE_LABELS[analysis.confidence]}</span>
      </div>
      {analysis.evidence.length > 0 ? (
        <div className="mb-2.5">
          <div className="mb-1 text-[11px] font-semibold text-[#8a8b93]">关键证据</div>
          <ul className="list-disc space-y-1 pl-4 text-[12px] leading-[1.7] text-[#4a4b53]">
            {analysis.evidence.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {analysis.followUp.length > 0 ? (
        <div>
          <div className="mb-1 text-[11px] font-semibold text-[#8a8b93]">建议追问</div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.followUp.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onFollowUp(item)}
                className="rounded-full border border-[#e5e7eb] px-2.5 py-1 text-[11px] text-[#52525b] transition-colors hover:bg-white"
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

import { CONFIDENCE_LABELS } from "./confidence"
import type { MessageAnalysis } from "./types"

export function AIAvatar() {
  return (
    <div
      className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0 mt-0.5"
      style={{ background: "#f4f4f5", border: "1px solid #e4e4e7" }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600">
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
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-bold text-[#62636b]">分析结果</span>
          <span className="text-[11px] text-[#8a8b93]">正在生成</span>
        </div>
        <div className="min-h-[124px]">
          <div className="mb-3">
            <div className="text-[11px] font-semibold text-[#8a8b93] mb-1.5">关键信息</div>
            <div className="space-y-1.5">
              <div className="h-3 rounded bg-[#ececf1] animate-pulse" />
              <div className="h-3 w-[92%] rounded bg-[#ececf1] animate-pulse" />
              <div className="h-3 w-[78%] rounded bg-[#ececf1] animate-pulse" />
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8a8b93] mb-1.5">建议追问</div>
            <div className="flex flex-wrap gap-1.5">
              <div className="h-6 w-20 rounded-full bg-[#ececf1] animate-pulse" />
              <div className="h-6 w-24 rounded-full bg-[#ececf1] animate-pulse" />
              <div className="h-6 w-16 rounded-full bg-[#ececf1] animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-[#62636b]">分析结果</span>
        <span className="text-[11px] text-[#8a8b93]">置信度：{CONFIDENCE_LABELS[analysis.confidence]}</span>
      </div>
      {analysis.evidence.length > 0 && (
        <div className="mb-2.5">
          <div className="text-[11px] font-semibold text-[#8a8b93] mb-1">关键证据</div>
          <ul className="text-[12px] leading-[1.7] text-[#4a4b53] list-disc pl-4 space-y-1">
            {analysis.evidence.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {analysis.followUp.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-[#8a8b93] mb-1">建议追问</div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.followUp.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onFollowUp(item)}
                className="px-2.5 py-1 rounded-full border border-[#e5e7eb] text-[11px] text-[#52525b] hover:bg-white transition-colors"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

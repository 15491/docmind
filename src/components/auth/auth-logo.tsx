import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export function AuthLogo() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2.5 justify-center mb-4">
        <div
          className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-[13px] font-bold text-white tracking-tight"
          style={{ background: "#18181b", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
        >
          D
        </div>
        <span className="text-[15px] font-bold text-[#0f0f10] tracking-tight">DocMind</span>
      </div>
      <div className="flex justify-center">
        <Link
          href="/"
          className="flex items-center gap-1 text-[12px] text-[#aaabb2] hover:text-[#62636b] transition-colors"
        >
          <ArrowLeft size={12} strokeWidth={2} />
          返回首页
        </Link>
      </div>
    </div>
  )
}

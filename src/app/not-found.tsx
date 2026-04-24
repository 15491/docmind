import Link from "next/link"
import { FileQuestion } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="flex items-center px-8 h-14 border-b border-[#ebebed]">
        <div className="flex items-center gap-2">
          <div
            className="w-[28px] h-[28px] rounded-[7px] flex items-center justify-center text-[12px] font-bold text-white tracking-tight"
            style={{ background: "#18181b", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
          >
            D
          </div>
          <span className="text-[14px] font-bold text-[#0f0f10] tracking-tight">DocMind</span>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8">
        <div className="w-14 h-14 rounded-[14px] bg-zinc-100 flex items-center justify-center">
          <FileQuestion size={22} strokeWidth={1.5} className="text-zinc-400" />
        </div>
        <div className="text-center">
          <p className="text-[11px] font-bold text-[#c0c0c8] uppercase tracking-wider mb-3">404</p>
          <p className="text-[15px] font-semibold text-[#0f0f10] mb-1.5">页面不存在</p>
          <p className="text-[12.5px] text-[#aaabb2] leading-relaxed">
            你访问的地址没有对应的页面
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="h-9 px-5 rounded-[9px] bg-zinc-900 text-white text-[13px] font-semibold hover:bg-zinc-700 transition-colors flex items-center"
          >
            去控制台
          </Link>
          <Link
            href="/"
            className="h-9 px-5 rounded-[9px] border border-[#ebebed] text-[13px] font-medium text-[#62636b] hover:border-zinc-300 hover:text-[#0f0f10] hover:bg-[#fafafa] transition-all flex items-center"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}

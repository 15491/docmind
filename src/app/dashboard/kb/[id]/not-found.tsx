import Link from "next/link"
import { BookOpen } from "lucide-react"

export default function KBNotFound() {
  return (
    <div className="h-full bg-white flex flex-col items-center justify-center gap-5 px-8">
      <div className="w-14 h-14 rounded-[14px] bg-zinc-100 flex items-center justify-center">
        <BookOpen size={22} strokeWidth={1.5} className="text-zinc-400" />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-[#0f0f10] mb-1.5">找不到该知识库</p>
        <p className="text-[12.5px] text-[#aaabb2] leading-relaxed">
          该知识库不存在或已被删除
        </p>
      </div>
      <Link
        href="/dashboard"
        className="h-9 px-5 rounded-[9px] border border-[#ebebed] text-[13px] font-medium text-[#62636b] hover:border-zinc-300 hover:text-[#0f0f10] hover:bg-[#fafafa] transition-all"
      >
        返回控制台
      </Link>
    </div>
  )
}

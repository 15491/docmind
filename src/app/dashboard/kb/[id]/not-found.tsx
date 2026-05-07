import Link from "next/link"
import { BookOpen } from "lucide-react"

export default function KBNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 bg-white px-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-zinc-100">
        <BookOpen size={22} strokeWidth={1.5} className="text-zinc-400" />
      </div>
      <div className="text-center">
        <p className="mb-1.5 text-[15px] font-semibold text-[#0f0f10]">找不到该知识库</p>
        <p className="text-[12.5px] leading-relaxed text-[#aaabb2]">
          该知识库不存在，或已被删除。
        </p>
      </div>
      <Link
        href="/dashboard"
        className="h-9 rounded-[9px] border border-[#ebebed] px-5 text-[13px] font-medium text-[#62636b] transition-all hover:border-zinc-300 hover:bg-[#fafafa] hover:text-[#0f0f10]"
      >
        返回控制台
      </Link>
    </div>
  )
}

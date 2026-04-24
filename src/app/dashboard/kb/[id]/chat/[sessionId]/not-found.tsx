"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { MessageSquare } from "lucide-react"

export default function SessionNotFound() {
  const router = useRouter()

  return (
    <div className="h-full bg-white flex flex-col items-center justify-center gap-5 px-8">
      <div className="w-14 h-14 rounded-[14px] bg-zinc-100 flex items-center justify-center">
        <MessageSquare size={22} strokeWidth={1.5} className="text-zinc-400" />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-[#0f0f10] mb-1.5">找不到该对话</p>
        <p className="text-[12.5px] text-[#aaabb2] leading-relaxed">
          该对话记录不存在或已被删除
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="h-9 px-5 rounded-[9px] border border-[#ebebed] text-[13px] font-medium text-[#62636b] hover:border-zinc-300 hover:text-[#0f0f10] hover:bg-[#fafafa] transition-all"
        >
          返回上一页
        </button>
        <Link
          href="/dashboard"
          className="h-9 px-5 rounded-[9px] bg-zinc-900 text-white text-[13px] font-semibold hover:bg-zinc-700 transition-colors flex items-center"
        >
          控制台
        </Link>
      </div>
    </div>
  )
}

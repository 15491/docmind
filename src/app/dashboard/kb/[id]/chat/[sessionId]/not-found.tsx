"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { MessageSquare } from "lucide-react"

export default function SessionNotFound() {
  const router = useRouter()

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 bg-white px-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-zinc-100">
        <MessageSquare size={22} strokeWidth={1.5} className="text-zinc-400" />
      </div>
      <div className="text-center">
        <p className="mb-1.5 text-[15px] font-semibold text-[#0f0f10]">找不到该对话</p>
        <p className="text-[12.5px] leading-relaxed text-[#aaabb2]">
          该对话记录不存在，或已被删除。
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="h-9 rounded-[9px] border border-[#ebebed] px-5 text-[13px] font-medium text-[#62636b] transition-all hover:border-zinc-300 hover:bg-[#fafafa] hover:text-[#0f0f10]"
        >
          返回上一页
        </button>
        <Link
          href="/dashboard"
          className="flex h-9 items-center rounded-[9px] bg-zinc-900 px-5 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700"
        >
          控制台
        </Link>
      </div>
    </div>
  )
}

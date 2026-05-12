"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { MessageSquare } from "lucide-react"

export default function SessionNotFound() {
  const router = useRouter()

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 bg-background px-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-muted">
        <MessageSquare size={22} strokeWidth={1.5} className="text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="mb-1.5 text-[15px] font-semibold text-foreground">找不到该对话</p>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          该对话记录不存在，或已被删除。
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="h-9 rounded-[9px] border border-border px-5 text-[13px] font-medium text-muted-foreground transition-all hover:border-foreground/30 hover:bg-muted hover:text-foreground"
        >
          返回上一页
        </button>
        <Link
          href="/dashboard"
          className="flex h-9 items-center rounded-[9px] bg-primary px-5 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          控制台
        </Link>
      </div>
    </div>
  )
}

import Link from "next/link"
import { BookOpen } from "lucide-react"

export default function KBNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 bg-background px-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-muted">
        <BookOpen size={22} strokeWidth={1.5} className="text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="mb-1.5 text-[15px] font-semibold text-foreground">找不到该知识库</p>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          该知识库不存在，或已被删除。
        </p>
      </div>
      <Link
        href="/dashboard"
        className="h-9 rounded-[9px] border border-border px-5 text-[13px] font-medium text-muted-foreground transition-all hover:border-foreground/30 hover:bg-muted hover:text-foreground"
      >
        返回控制台
      </Link>
    </div>
  )
}

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export function AuthLogo() {
  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-center gap-2.5">
        <div className="bg-primary text-primary-foreground flex h-[30px] w-[30px] items-center justify-center rounded-[8px] text-[13px] font-bold tracking-tight">
          D
        </div>
        <span className="text-foreground text-[15px] font-bold tracking-tight">DocMind</span>
      </div>
      <div className="flex justify-center">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[12px] transition-colors"
        >
          <ArrowLeft size={12} strokeWidth={2} />
          返回首页
        </Link>
      </div>
    </div>
  )
}

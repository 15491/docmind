import Link from "next/link"
import { FileText, MessageSquare } from "lucide-react"
import { DashboardPageHeader } from "@/components/layout/dashboard-shell"

type KbPageHeaderProps = {
  kbId: string
  kbName: string
  pathname: string
  docCount?: number
}

type HeaderAction = {
  href: string
  icon: typeof FileText
  label: string
}

function getHeaderState(kbId: string, pathname: string) {
  const basePath = `/dashboard/kb/${kbId}`
  const chatPath = `${basePath}/chat`
  const docsPath = `${basePath}/docs`

  if (pathname === basePath) {
    return {
      currentLabel: "",
      action: {
        href: chatPath,
        icon: MessageSquare,
        label: "开始问答",
      } satisfies HeaderAction,
      showDocCount: true,
    }
  }

  if (pathname === chatPath) {
    return {
      currentLabel: "对话",
      action: {
        href: basePath,
        icon: FileText,
        label: "管理文档",
      } satisfies HeaderAction,
      showDocCount: true,
    }
  }

  if (pathname.startsWith(`${chatPath}/`)) {
    return {
      currentLabel: "会话",
      action: {
        href: basePath,
        icon: FileText,
        label: "管理文档",
      } satisfies HeaderAction,
      showDocCount: true,
    }
  }

  if (pathname.startsWith(`${docsPath}/`)) {
    return {
      currentLabel: "文档预览",
      action: null,
      showDocCount: false,
    }
  }

  return {
    currentLabel: "",
    action: null,
    showDocCount: false,
  }
}

export function KbPageHeader({ kbId, kbName, pathname, docCount }: KbPageHeaderProps) {
  const { currentLabel, action, showDocCount } = getHeaderState(kbId, pathname)
  const breadcrumbs = [
    { label: "控制台", href: "/dashboard" },
    { label: kbName, href: currentLabel ? `/dashboard/kb/${kbId}` : undefined },
    ...(currentLabel ? [{ label: currentLabel }] : []),
  ]

  const badge = showDocCount
    ? docCount && docCount > 0 ? (
      <span className="text-muted-foreground flex flex-shrink-0 items-center gap-1.5 text-[12px]">
        <span className="bg-muted-foreground/40 h-1.5 w-1.5 rounded-full" />
        {docCount} 篇文档
      </span>
    ) : (
      <span className="text-muted-foreground flex-shrink-0 text-[12px]">
        暂无文档
      </span>
    )
    : null

  const actions = action ? (
    <Link
      href={action.href}
      className="border-input text-muted-foreground hover:border-foreground/30 hover:bg-muted hover:text-foreground flex h-8 items-center gap-1.5 rounded-[8px] border px-3 text-[12px] font-semibold transition-colors"
    >
      <action.icon size={12} strokeWidth={1.8} />
      {action.label}
    </Link>
  ) : null

  return <DashboardPageHeader size="compact" breadcrumbs={breadcrumbs} badge={badge} actions={actions} />
}

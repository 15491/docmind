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
      <span
        className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
        style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.22)" }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {docCount} 篇文档
      </span>
    ) : (
      <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-600">
        暂无文档
      </span>
    )
    : null

  const actions = action ? (
    <Link
      href={action.href}
      className="flex h-8 items-center gap-1.5 rounded-[8px] border-[1.5px] border-[#ebebed] px-3 text-[12px] font-semibold text-[#62636b] transition-all hover:border-[#d0d0d8] hover:bg-[#fafafa] hover:text-[#0f0f10]"
    >
      <action.icon size={12} strokeWidth={1.8} />
      {action.label}
    </Link>
  ) : null

  return <DashboardPageHeader size="compact" breadcrumbs={breadcrumbs} badge={badge} actions={actions} />
}

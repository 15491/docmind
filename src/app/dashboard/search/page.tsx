"use client"

import { DashboardPageHeader } from "@/components/layout/dashboard-shell"
import { SearchWorkspace } from "@/components/search/search-workspace"

export default function SearchPage() {
  return (
    <div className="h-full overflow-y-auto bg-[#fcfcfd]">
      <DashboardPageHeader
        size="compact"
        breadcrumbs={[
          { label: "控制台", href: "/dashboard" },
          { label: "搜索" },
        ]}
      />
      <SearchWorkspace variant="page" />
    </div>
  )
}

"use client"

import { useState } from "react"
import { DashboardPageHeader } from "@/components/layout/dashboard-shell"
import { PageContent } from "@/components/layout/page-content"
import { SECTIONS } from "./constants"
import { ProfileSection, ApiSection, RagSection, DangerSection } from "./sections"
import type { Section } from "./types"

export default function SettingsPage() {
  const [active, setActive] = useState<Section>("profile")

  return (
    <div className="h-full overflow-y-auto bg-white">
      <DashboardPageHeader
        size="compact"
        breadcrumbs={[
          { label: "控制台", href: "/dashboard" },
          { label: "设置" },
        ]}
      />

      <PageContent width="3xl">
        <div className="mb-6">
          <h1 className="text-[18px] font-semibold tracking-tight text-[#0f0f10]">设置</h1>
          <p className="mt-1 text-[12.5px] text-[#8a8b93]">管理个人资料、API 配置和 RAG 参数。</p>
        </div>

        <div className="flex gap-8">
          <nav className="w-[160px] flex-shrink-0 space-y-0.5">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActive(id)}
                className={`flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-left text-[13px] font-medium transition-all ${
                  active === id
                    ? "bg-zinc-900 text-white"
                    : "text-[#55555e] hover:bg-[#f3f3f5] hover:text-[#0f0f10]"
                }`}
              >
                <Icon size={14} strokeWidth={active === id ? 2.2 : 1.8} />
                {label}
              </button>
            ))}
          </nav>

          <div className="min-w-0 flex-1">
            {active === "profile" && <ProfileSection key="profile" />}
            {active === "api" && <ApiSection key="api" />}
            {active === "rag" && <RagSection key="rag" />}
            {active === "danger" && <DangerSection key="danger" />}
          </div>
        </div>
      </PageContent>
    </div>
  )
}

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
    <div className="h-full overflow-y-auto bg-background">
      <DashboardPageHeader
        size="compact"
        breadcrumbs={[
          { label: "控制台", href: "/dashboard" },
          { label: "设置" },
        ]}
      />

      <PageContent width="full">
        <div className="max-w-[1200px]">
          <div className="mb-7 max-w-[520px]">
            <h1 className="text-[20px] font-semibold tracking-tight text-foreground">设置</h1>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
              管理个人资料、模型密钥与检索参数。常用内容固定在左侧，编辑区域保持靠左展开。
            </p>
          </div>

          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-10">
            <nav className="w-full flex-shrink-0 rounded-[14px] border border-border bg-muted p-2 xl:sticky xl:top-6 xl:w-[190px]">
              <div className="mb-2 px-2.5 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                设置分组
              </div>
              <div className="space-y-1">
                {SECTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActive(id)}
                    className={`flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium transition-all ${
                      active === id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-background hover:text-foreground"
                    }`}
                  >
                    <Icon size={14} strokeWidth={active === id ? 2.2 : 1.8} />
                    {label}
                  </button>
                ))}
              </div>
            </nav>

            <div className="min-w-0 max-w-[820px] flex-1">
              {active === "profile" && <ProfileSection key="profile" />}
              {active === "api" && <ApiSection key="api" />}
              {active === "rag" && <RagSection key="rag" />}
              {active === "danger" && <DangerSection key="danger" />}
            </div>
          </div>
        </div>
      </PageContent>
    </div>
  )
}

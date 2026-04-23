"use client"

import { useState } from "react"
import { SECTIONS } from "./constants"
import type { Section } from "./types"
import { ProfileSection, ApiSection, RagSection, DangerSection } from "./sections"

export default function SettingsPage() {
  const [active, setActive] = useState<Section>("profile")

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="px-8 pt-8 pb-6">
        <h1 className="text-[15px] font-semibold text-[#0f0f10] tracking-tight">设置</h1>
      </div>

      <div className="px-8 pb-10 flex gap-8 max-w-3xl">
        <nav className="w-[160px] flex-shrink-0 space-y-0.5">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-all text-left ${
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

        <div className="flex-1 min-w-0">
          {active === "profile" && <ProfileSection key="profile" />}
          {active === "api"     && <ApiSection     key="api" />}
          {active === "rag"     && <RagSection     key="rag" />}
          {active === "danger"  && <DangerSection  key="danger" />}
        </div>
      </div>
    </div>
  )
}

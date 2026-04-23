"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, Search, Settings, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"

const NAV_ITEMS = [
  { href: "/dashboard", icon: BookOpen, label: "知识库" },
  { href: "/dashboard/search", icon: Search, label: "搜索" },
]

const AUTO_COLLAPSE_WIDTH = 1100

export function IconNav() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  // 记录用户是否手动展开过（防止宽屏自动展开覆盖用户折叠意图）
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null)

  useEffect(() => {
    const check = () => {
      const narrow = window.innerWidth < AUTO_COLLAPSE_WIDTH
      // 视口变窄时强制折叠；变宽时只有在用户未手动折叠的情况下才展开
      if (narrow) {
        setCollapsed(true)
      } else if (userCollapsed !== true) {
        setCollapsed(false)
      }
    }
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [userCollapsed])

  const handleCollapse = () => {
    setCollapsed(true)
    setUserCollapsed(true)
  }

  const handleExpand = () => {
    setCollapsed(false)
    setUserCollapsed(false)
  }

  const isNavActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard" || pathname.startsWith("/dashboard/kb")
      : pathname === href || pathname.startsWith(href + "/")

  const isSettingsActive = pathname.startsWith("/dashboard/settings")

  return (
    <nav
      className="flex-shrink-0 border-r border-[#ebebed] bg-white flex flex-col overflow-hidden z-10"
      style={{
        width: collapsed ? 52 : 220,
        transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* ── 顶部 Logo 区 ── */}
      <div className={`h-[52px] flex items-center flex-shrink-0 border-b border-[#f0f0f3] ${collapsed ? "justify-center" : "px-3 gap-2"}`}>
        {collapsed ? (
          <button
            type="button"
            onClick={handleExpand}
            title="展开菜单"
            className="flex items-center justify-center gap-1.5 w-full h-full hover:bg-[#f3f3f5] transition-colors"
          >
            <div className="w-[24px] h-[24px] rounded-[6px] bg-zinc-900 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
              D
            </div>
            <ChevronRight size={12} strokeWidth={2.5} className="text-[#b0b0b8]" />
          </button>
        ) : (
          <>
            <Link
              href="/dashboard"
              className="w-[28px] h-[28px] rounded-[7px] bg-zinc-900 flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0 hover:bg-zinc-700 transition-colors"
            >
              D
            </Link>
            <span className="text-[14px] font-bold text-[#0f0f10] tracking-tight flex-1 whitespace-nowrap">
              DocMind
            </span>
            <button
              type="button"
              onClick={handleCollapse}
              title="收起菜单"
              className="w-6 h-6 rounded-[6px] flex items-center justify-center text-[#c0c0c8] hover:bg-[#f3f3f5] hover:text-zinc-600 transition-colors flex-shrink-0"
            >
              <ChevronLeft size={14} strokeWidth={2.2} />
            </button>
          </>
        )}
      </div>

      {/* ── 主导航 ── */}
      <div className="flex-1 flex flex-col py-2 px-2 gap-0.5 overflow-hidden">
        {!collapsed && (
          <p className="px-2 pt-1 pb-1.5 text-[10px] font-bold text-[#c8c8d0] uppercase tracking-[0.08em] whitespace-nowrap">
            菜单
          </p>
        )}

        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = isNavActive(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center rounded-[8px] h-[34px] transition-colors whitespace-nowrap overflow-hidden ${
                collapsed ? "justify-center px-0" : "gap-2.5 px-2.5"
              } ${
                active
                  ? "bg-zinc-900 text-white"
                  : "text-[#55555e] hover:bg-[#f3f3f5] hover:text-[#0f0f10]"
              }`}
            >
              <Icon size={15} strokeWidth={active ? 2.2 : 1.8} className="flex-shrink-0" />
              <span
                className="text-[13px] font-medium"
                style={{
                  opacity: collapsed ? 0 : 1,
                  width: collapsed ? 0 : "auto",
                  transition: "opacity 0.15s ease",
                }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>

      {/* ── 底部：设置 + 用户 ── */}
      <div className="border-t border-[#f0f0f3] py-2 px-2 space-y-0.5">
        {!collapsed && (
          <p className="px-2 pt-0.5 pb-1 text-[10px] font-bold text-[#c8c8d0] uppercase tracking-[0.08em] whitespace-nowrap">
            系统
          </p>
        )}

        <Link
          href="/dashboard/settings"
          title={collapsed ? "设置" : undefined}
          className={`flex items-center rounded-[8px] h-[34px] transition-colors whitespace-nowrap overflow-hidden ${
            collapsed ? "justify-center px-0" : "gap-2.5 px-2.5"
          } ${
            isSettingsActive
              ? "bg-zinc-900 text-white"
              : "text-[#55555e] hover:bg-[#f3f3f5] hover:text-[#0f0f10]"
          }`}
        >
          <Settings size={15} strokeWidth={isSettingsActive ? 2.2 : 1.8} className="flex-shrink-0" />
          <span
            className="text-[13px] font-medium"
            style={{
              opacity: collapsed ? 0 : 1,
              width: collapsed ? 0 : "auto",
              transition: "opacity 0.15s ease",
            }}
          >
            设置
          </span>
        </Link>

        {/* 用户信息 */}
        <div
          title={collapsed ? "yc.bai" : undefined}
          className={`flex items-center rounded-[8px] h-[34px] cursor-pointer hover:bg-[#f3f3f5] transition-colors whitespace-nowrap overflow-hidden ${
            collapsed ? "justify-center px-0" : "gap-2.5 px-2.5"
          }`}
        >
          <div className="w-[22px] h-[22px] rounded-full bg-zinc-900 flex items-center justify-center text-[9.5px] font-bold text-white flex-shrink-0">
            白
          </div>
          <div
            className="flex flex-col min-w-0"
            style={{
              opacity: collapsed ? 0 : 1,
              width: collapsed ? 0 : "auto",
              transition: "opacity 0.15s ease",
            }}
          >
            <span className="text-[12.5px] font-semibold text-[#0f0f10] truncate leading-tight">yc.bai</span>
            <span className="text-[10.5px] text-[#aaabb2] truncate leading-tight">免费计划</span>
          </div>
        </div>
      </div>
    </nav>
  )
}

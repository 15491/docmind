"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, Settings, ChevronLeft, ChevronRight, LogOut } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useSession, signOut } from "next-auth/react"
import { GlobalSearch } from "./global-search"

const NAV_ITEMS = [
  { href: "/dashboard", icon: BookOpen, label: "知识库" },
]

const AUTO_COLLAPSE_WIDTH = 1100

export function IconNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null)
  const [showLogout, setShowLogout] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowLogout(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const check = () => {
      const narrow = window.innerWidth < AUTO_COLLAPSE_WIDTH

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
      className="relative z-10 flex flex-shrink-0 flex-col border-r border-[#ebebed] bg-white"
      style={{
        width: collapsed ? 52 : 220,
        transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)",
        overflow: "visible",
      }}
    >
      <div className={`h-[52px] flex items-center flex-shrink-0 border-b border-[#f0f0f3] overflow-hidden ${collapsed ? "justify-center" : "px-3 gap-2"}`}>
        {collapsed ? (
          <>
            <Link
              href="/dashboard"
              className="w-[28px] h-[28px] rounded-[7px] bg-zinc-900 flex items-center justify-center text-[12px] font-bold text-white hover:bg-zinc-700 transition-colors"
            >
              D
            </Link>
            <button
              type="button"
              onClick={handleExpand}
              title="展开菜单"
              className="absolute -right-[13px] top-[18px] w-[22px] h-[22px] rounded-full bg-white border border-[#e0e0e6] shadow-sm flex items-center justify-center text-[#aaabb2] hover:text-zinc-700 hover:border-zinc-300 hover:shadow-md transition-all z-20"
            >
              <ChevronRight size={11} strokeWidth={2.5} />
            </button>
          </>
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
              className="absolute -right-[13px] top-[18px] w-[22px] h-[22px] rounded-full bg-white border border-[#e0e0e6] shadow-sm flex items-center justify-center text-[#aaabb2] hover:text-zinc-700 hover:border-zinc-300 hover:shadow-md transition-all z-20"
            >
              <ChevronLeft size={11} strokeWidth={2.5} />
            </button>
          </>
        )}
      </div>

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

        <GlobalSearch collapsed={collapsed} />
      </div>

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

        <div ref={userRef} className="relative">
          <button
            type="button"
            title={collapsed ? (session?.user?.name ?? "用户") : undefined}
            onClick={() => setShowLogout((visible) => !visible)}
            className={`w-full flex items-center rounded-[8px] h-[34px] cursor-pointer hover:bg-[#f3f3f5] transition-colors whitespace-nowrap overflow-hidden ${
              collapsed ? "justify-center px-0" : "gap-2.5 px-2.5"
            }`}
          >
            <div className="w-[22px] h-[22px] rounded-full bg-zinc-900 flex items-center justify-center text-[9.5px] font-bold text-white flex-shrink-0">
              {(session?.user?.name ?? session?.user?.email ?? "U")[0].toUpperCase()}
            </div>
            <div
              className="flex flex-col min-w-0"
              style={{
                opacity: collapsed ? 0 : 1,
                width: collapsed ? 0 : "auto",
                transition: "opacity 0.15s ease",
              }}
            >
              <span className="text-[12.5px] font-semibold text-[#0f0f10] truncate leading-tight">
                {session?.user?.name ?? session?.user?.email ?? "用户"}
              </span>
              <span className="text-[10.5px] text-[#aaabb2] truncate leading-tight">免费计划</span>
            </div>
          </button>
          {showLogout && (
            <div className={`absolute bottom-full mb-1.5 bg-white border border-[#ebebed] rounded-[10px] shadow-[0_4px_20px_rgba(0,0,0,0.1)] py-1 z-50 ${collapsed ? "left-0" : "left-0 right-0"}`}>
              <button
                type="button"
                onClick={() => signOut({ redirectTo: "/login" })}
                className="w-full flex items-center gap-2.5 px-3 h-[34px] text-[13px] text-red-500 hover:bg-red-50 transition-colors rounded-[8px]"
              >
                <LogOut size={14} strokeWidth={2} />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

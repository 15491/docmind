import { IconNav } from "@/components/layout/icon-nav"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <IconNav />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <div className="p-8">
      <div className="h-7 w-32 bg-[#f0f0f3] rounded-[6px] mb-6 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-[#f0f0f3] rounded-[12px] animate-pulse" />
        ))}
      </div>
    </div>
  )
}

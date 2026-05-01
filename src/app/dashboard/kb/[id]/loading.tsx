export default function KBLoading() {
  return (
    <div className="p-8">
      <div className="h-6 w-48 bg-[#f0f0f3] rounded-[6px] mb-6 animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 bg-[#f0f0f3] rounded-[10px] animate-pulse" />
        ))}
      </div>
    </div>
  )
}

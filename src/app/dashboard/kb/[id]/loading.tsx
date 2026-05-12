import { Skeleton } from "@/components/ui/skeleton"

export default function KBLoading() {
  return (
    <div className="p-8">
      <Skeleton className="h-6 w-48 rounded-[6px] mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-[10px]" />
        ))}
      </div>
    </div>
  )
}

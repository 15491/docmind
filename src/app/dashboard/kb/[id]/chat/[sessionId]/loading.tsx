export default function ChatLoading() {
  return (
    <div className="flex flex-col gap-4 p-6 h-full">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className={`h-16 w-2/3 bg-[#f0f0f3] rounded-[12px] animate-pulse ${i % 2 === 1 ? "self-end" : ""}`}
        />
      ))}
    </div>
  )
}

export function AuthLogo() {
  return (
    <div className="flex items-center gap-2.5 mb-8 justify-center">
      <div
        className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-[13px] font-bold text-white tracking-tight"
        style={{ background: "#18181b", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
      >
        D
      </div>
      <span className="text-[15px] font-bold text-[#0f0f10] tracking-tight">DocMind</span>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Check, Eye, EyeOff } from "lucide-react"

export function SaveButton({ onSave }: { onSave: () => Promise<void> }) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle")

  const handle = async () => {
    if (state === "saving") return
    setState("saving")
    try {
      await onSave()
      setState("saved")
      setTimeout(() => setState("idle"), 2000)
    } catch {
      setState("idle")
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={state === "saving"}
      className="h-8 px-4 rounded-[8px] text-[12.5px] font-semibold transition-all flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
      style={state === "saved"
        ? { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }
        : { background: "#18181b", color: "#fff" }
      }
    >
      {state === "saved"
        ? <><Check size={12} strokeWidth={2.5} />已保存</>
        : state === "saving" ? "保存中…" : "保存更改"}
    </button>
  )
}

export function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-8 py-4 border-b border-[#f2f2f5] last:border-0">
      <div className="min-w-[140px]">
        <p className="text-[13px] font-medium text-[#35353d]">{label}</p>
        {hint && <p className="text-[11.5px] text-[#aaabb2] mt-0.5 leading-snug">{hint}</p>}
      </div>
      <div className="flex-1 max-w-xs">{children}</div>
    </div>
  )
}

export function TextInput({ value, onChange, type = "text", placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-9 bg-white border-[1.5px] border-[#e2e2e8] rounded-[8px] px-3 text-[13px] text-[#0f0f10] placeholder:text-[#c8c8d0] outline-none focus:border-zinc-700 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.07)] transition-all font-sans"
    />
  )
}

export function MaskInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 bg-white border-[1.5px] border-[#e2e2e8] rounded-[8px] pl-3 pr-9 text-[13px] text-[#0f0f10] placeholder:text-[#c8c8d0] outline-none focus:border-zinc-700 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.07)] transition-all font-sans"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#c0c0c8] hover:text-zinc-500 transition-colors"
      >
        {show ? <EyeOff size={14} strokeWidth={1.8} /> : <Eye size={14} strokeWidth={1.8} />}
      </button>
    </div>
  )
}

export function RangeInput({ value, onChange, min, max, step, unit }: {
  value: number; onChange: (v: number) => void
  min: number; max: number; step: number; unit: string
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-zinc-900 h-1.5 rounded-full cursor-pointer"
      />
      <span className="text-[12.5px] font-semibold text-zinc-700 tabular-nums w-16 text-right">
        {value}{unit ? ` ${unit}` : ""}
      </span>
    </div>
  )
}

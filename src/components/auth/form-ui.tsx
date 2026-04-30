export const INPUT_CLS =
  "w-full h-9 bg-white border-[1.5px] border-[#e2e2e8] rounded-[8px] px-3 pr-16 text-[13px] text-[#0f0f10] placeholder:text-[#c8c8d0] outline-none focus:border-zinc-700 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.07)] transition-all font-sans"

export const LABEL_CLS =
  "block text-[11.5px] font-semibold text-[#62636b] mb-1.5 uppercase tracking-wide"

export const ICON_BTN_CLS =
  "flex items-center justify-center w-6 h-6 text-[#aaabb2] hover:text-[#55555e] transition-colors"

export function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function ClearIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

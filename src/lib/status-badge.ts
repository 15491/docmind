export type StatusLevel = "success" | "warning" | "error"

const BASE =
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium"

const VARIANTS: Record<StatusLevel, string> = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  error:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
}

export function getStatusBadgeClass(level: StatusLevel) {
  return `${BASE} ${VARIANTS[level]}`
}

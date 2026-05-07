import { cn } from "@/lib/utils"

const WIDTH_CLASS_MAP = {
  full: "w-full",
  "3xl": "mx-auto w-full max-w-3xl",
  "5xl": "mx-auto w-full max-w-5xl",
} as const

type PageContentProps = {
  children: React.ReactNode
  className?: string
  width?: keyof typeof WIDTH_CLASS_MAP
}

export function PageContent({
  children,
  className,
  width = "full",
}: PageContentProps) {
  return (
    <div className={cn("px-8 py-6", WIDTH_CLASS_MAP[width], className)}>
      {children}
    </div>
  )
}

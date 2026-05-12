import Link from "next/link"

export type BreadcrumbItem = {
  label: string
  href?: string
}

export type PageHeaderProps = {
  breadcrumbs: BreadcrumbItem[]
  title?: string
  description?: React.ReactNode
  meta?: React.ReactNode
  badge?: React.ReactNode
  actions?: React.ReactNode
  size?: "default" | "compact"
}

function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2.5">
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <div key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2.5">
            {index > 0 ? <span className="text-muted-foreground/60 flex-shrink-0">/</span> : null}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground truncate text-[12.5px] font-medium transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`truncate ${
                  isLast
                    ? "text-foreground text-[13.5px] font-semibold"
                    : "text-muted-foreground text-[12.5px] font-medium"
                }`}
              >
                {item.label}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function PageHeader({
  breadcrumbs,
  title,
  description,
  meta,
  badge,
  actions,
  size = "default",
}: PageHeaderProps) {
  if (size === "compact") {
    return (
      <header className="border-border bg-background flex h-[52px] flex-shrink-0 items-center justify-between border-b px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <Breadcrumbs items={breadcrumbs} />
          {badge}
        </div>
        {actions ? <div className="ml-3 flex flex-shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
    )
  }

  return (
    <header className="border-border bg-background flex-shrink-0 border-b px-8 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Breadcrumbs items={breadcrumbs} />
          {title || description || meta ? (
            <div className="mt-3">
              {title ? <h1 className="text-foreground text-[18px] font-semibold tracking-tight">{title}</h1> : null}
              {description ? <p className="text-muted-foreground mt-1 text-[12.5px]">{description}</p> : null}
              {meta ? <div className="mt-1.5">{meta}</div> : null}
            </div>
          ) : null}
        </div>
        {actions ? <div className="flex flex-shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}

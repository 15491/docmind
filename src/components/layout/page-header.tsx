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
            {index > 0 ? <span className="flex-shrink-0 text-[#d8d8de]">/</span> : null}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="truncate text-[12.5px] font-medium text-[#aaabb2] transition-colors hover:text-[#62636b]"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`truncate ${
                  isLast
                    ? "text-[13.5px] font-semibold text-[#0f0f10]"
                    : "text-[12.5px] font-medium text-[#aaabb2]"
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
      <header className="flex h-[52px] flex-shrink-0 items-center justify-between border-b border-[#ebebed] bg-white px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <Breadcrumbs items={breadcrumbs} />
          {badge}
        </div>
        {actions ? <div className="ml-3 flex flex-shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
    )
  }

  return (
    <header className="flex-shrink-0 border-b border-[#f0f0f3] bg-white px-8 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Breadcrumbs items={breadcrumbs} />
          {title || description || meta ? (
            <div className="mt-3">
              {title ? <h1 className="text-[18px] font-semibold tracking-tight text-[#0f0f10]">{title}</h1> : null}
              {description ? <p className="mt-1 text-[12.5px] text-[#8a8b93]">{description}</p> : null}
              {meta ? <div className="mt-1.5">{meta}</div> : null}
            </div>
          ) : null}
        </div>
        {actions ? <div className="flex flex-shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}

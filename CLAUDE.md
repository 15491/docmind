# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
npm run start    # Start production server (run build first)
```

No test runner is configured yet.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript 5**
- **Tailwind CSS 4** (PostCSS plugin, not the Vite plugin — config lives in `globals.css` via `@import "tailwindcss"`)
- **shadcn/ui** components in `src/components/ui/` — add new ones via `npx shadcn add <component>`
- **React Compiler** is enabled (`reactCompiler: true` in `next.config.ts`) — avoid manual `useMemo`/`useCallback`
- Path alias: `@/*` → `src/*`
- Fonts: `Plus_Jakarta_Sans` (sans, body) + `JetBrains_Mono` (mono) loaded via `next/font/google`, exposed as CSS vars `--font-sans` / `--font-mono`

## Architecture

### Route layout hierarchy

```
app/layout.tsx              ← html/body, fonts, global metadata
app/page.tsx                ← landing page (public)
app/login/                  ← public auth pages
app/register/
app/dashboard/layout.tsx    ← adds <IconNav> sidebar, full-height flex
  app/dashboard/page.tsx
  app/dashboard/search/
  app/dashboard/settings/
  app/dashboard/kb/[id]/
    app/dashboard/kb/[id]/chat/layout.tsx   ← adds session history sidebar
      app/dashboard/kb/[id]/chat/page.tsx   ← new chat
      app/dashboard/kb/[id]/chat/[sessionId]/page.tsx  ← existing session
```

### File organisation convention (per page/route)

Every route directory follows the same split:

| File | Purpose |
|------|---------|
| `types.ts` | TypeScript interfaces/types for this route |
| `constants.ts` | Mock data, static config, lookup maps |
| `hooks.ts` | All `useState` / `useEffect` / handlers — exported as custom hooks |
| `components.tsx` | Sub-components only used within this route |
| `page.tsx` | Pure JSX — imports from all the above, no logic inline |

Shared sub-routes reuse from parent: `[sessionId]/page.tsx` imports `useChat` from `../hooks` and `AIAvatar` from `../components`.

### Shared components (`src/components/`)

- `layout/icon-nav.tsx` — collapsible sidebar nav; auto-collapses below 1100 px viewport width, respects manual user intent via `userCollapsed` state flag
- `auth/auth-logo.tsx` — logo block used on login/register pages
- `auth/oauth-buttons.tsx` — GitHub + Google OAuth buttons, accepts `mode: "登录" | "注册"` prop
- `ui/` — shadcn/ui primitives (do not edit directly)

### Client vs Server components

All pages are currently `"use client"` — no server-side data fetching exists yet. Layouts that use hooks (`usePathname`, `use(params)`) are also marked `"use client"`.

## Pending for API integration phase

- Replace `// TODO: call API` stubs in all `hooks.ts` files
- Add `not-found.tsx` to dynamic routes (`[id]`, `[sessionId]`) first
- Then `error.tsx` under `dashboard/` for API failure boundaries
- Then `loading.tsx` for routes with visible fetch latency

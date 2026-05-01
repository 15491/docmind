import type { Metadata } from "next"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

export const metadata: Metadata = {
  title: "DocMind — AI 知识库问答",
  description: "上传任意文档，基于文档内容进行精准 AI 问答，回答带引用溯源。",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full"
      style={{
        // 系统字体栈：macOS/iOS → Windows → Linux/Web 回退
        fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif`,
      }}
    >
      <body className="min-h-full bg-white text-[#0f0f10] antialiased">
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}

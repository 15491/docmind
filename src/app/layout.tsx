import type { Metadata } from "next"
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const plusJakartaSans = Plus_Jakarta_Sans({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap", // 立即使用系统字体，Google Fonts 加载后替换
})

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap", // 立即使用系统字体，Google Fonts 加载后替换
})

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
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full`}
      style={{
        // 字体栈：Google Font → 系统字体回退
        fontFamily: `var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif)`
      }}
    >
      <body className="min-h-full font-sans bg-white text-[#0f0f10] antialiased">
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}

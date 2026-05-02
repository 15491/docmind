import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // pdfjs-dist 必须原生加载：若被 bundler 打包，GlobalWorkerOptions 会变成独立副本
  // 导致 workerSrc 设置对内部模块不可见，抛出 "No workerSrc specified" 错误
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;

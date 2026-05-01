import { join } from 'path'

/**
 * 获取项目根目录的临时文件夹绝对路径
 * 相对于 src/lib 文件夹的位置，向上 2 层到项目根目录
 */
export function getTempDir(): string {
  // __filename 是当前文件的绝对路径
  // src/lib/temp-dir.ts -> src -> project-root
  const currentFile = __filename // e.g., D:\Code\project\docmind\src\lib\temp-dir.ts
  const libDir = __dirname // e.g., D:\Code\project\docmind\src\lib
  const srcDir = join(libDir, '..')
  const projectRoot = join(srcDir, '..')
  const tempDir = join(projectRoot, '.temp')
  return tempDir
}

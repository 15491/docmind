import { join } from 'path'
import { homedir } from 'os'

/**
 * 获取临时文件目录绝对路径
 * 优先级：
 * 1. TEMP_DIR 环境变量（如果设置）
 * 2. 项目的 .temp 目录（开发环境）
 * 3. 系统用户主目录下的 .docmind-temp（生产环境备选）
 */
export function getTempDir(): string {
  // 检查环境变量
  if (process.env.TEMP_DIR) {
    return process.env.TEMP_DIR
  }

  // 优先使用当前工作目录（开发环境）
  if (process.env.NODE_ENV !== 'production') {
    return join(process.cwd(), '.temp')
  }

  // 生产环境：使用用户主目录
  return join(homedir(), '.docmind', 'temp')
}

/**
 * 获取相对于当前工作目录的临时目录路径
 */
export function getRelativeTempDir(): string {
  return '.temp'
}

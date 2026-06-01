export const DEFAULT_ZHIPU_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4'

export function getZhipuBaseUrl(): string {
  return process.env.ZHIPU_BASE_URL?.trim() || DEFAULT_ZHIPU_BASE_URL
}

export function buildZhipuUrl(path: string): string {
  const baseUrl = getZhipuBaseUrl().replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}

export function resolveApiKey(userApiKey?: string | null): string {
  const key = userApiKey?.trim() || process.env.ZHIPU_API_KEY?.trim()
  if (!key) throw new Error('Missing ZHIPU_API_KEY')
  return key
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type ApiResponse<T> = { ok: true; data: T } | { ok: false; code: string; message: string }

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData

  const res = await fetch(url, {
    ...init,
    headers: isFormData
      ? init?.headers                                               // FormData：浏览器自动设置 multipart boundary
      : { 'Content-Type': 'application/json', ...init?.headers },
  })

  const json = (await res.json()) as ApiResponse<T>

  if (!json.ok) {
    throw new ApiError(json.code, json.message)
  }

  return json.data
}

export const http = {
  get:    <T>(url: string)                    => request<T>(url),
  post:   <T>(url: string, body?: unknown)    => request<T>(url, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  <T>(url: string, body: unknown)     => request<T>(url, { method: 'PATCH',  body: JSON.stringify(body) }),
  del:    <T>(url: string)                    => request<T>(url, { method: 'DELETE' }),
  upload: <T>(url: string, fd: FormData)      => request<T>(url, { method: 'POST',   body: fd }),
}

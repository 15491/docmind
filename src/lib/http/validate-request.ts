import { NextResponse } from 'next/server'
import { z, ZodError, type ZodTypeAny } from 'zod'

const INVALID_JSON = Symbol('INVALID_JSON')

function validationErrorResponse(message: string, details?: ZodError['issues']) {
  return NextResponse.json(
    {
      ok: false,
      code: 'INVALID_INPUT',
      message,
      ...(details ? { details } : {}),
    },
    { status: 422 }
  )
}

export function isValidationErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse
}

export function validateRequest<TSchema extends ZodTypeAny>(
  data: unknown,
  schema: TSchema
): z.infer<TSchema> | NextResponse {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.errors[0]?.message || '参数校验失败'
      return validationErrorResponse(message, error.errors)
    }

    return validationErrorResponse('参数校验失败')
  }
}

export async function parseJsonBody<TSchema extends ZodTypeAny>(
  req: Request,
  schema: TSchema,
  invalidJsonMessage = '请求体格式错误'
): Promise<z.infer<TSchema> | NextResponse> {
  const body = await req.json().catch(() => INVALID_JSON)
  if (body === INVALID_JSON) {
    return validationErrorResponse(invalidJsonMessage)
  }

  return validateRequest(body, schema)
}

export function validateSearchParams<TSchema extends ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: TSchema
): z.infer<TSchema> | NextResponse {
  return validateRequest(Object.fromEntries(searchParams.entries()), schema)
}

export async function validateRouteParams<TSchema extends ZodTypeAny>(
  params: Promise<Record<string, string>> | Record<string, string>,
  schema: TSchema
): Promise<z.infer<TSchema> | NextResponse> {
  return validateRequest(await params, schema)
}

export interface FileValidationOptions {
  maxSize?: number
  allowedTypes?: string[]
}

export function validateFile(
  file: File | null,
  options: FileValidationOptions = {}
): string | null {
  if (!file) return '未提供文件'

  const { maxSize = 10 * 1024 * 1024, allowedTypes = [] } = options

  if (file.size > maxSize) {
    return `文件大小超过 ${(maxSize / 1024 / 1024).toFixed(0)}MB 限制`
  }

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return `不支持的文件类型: ${file.type}`
  }

  return null
}

import { NextResponse } from 'next/server'
import { ZodSchema, ZodError } from 'zod'

/**
 * 验证请求数据
 * @param data 要验证的数据
 * @param schema Zod 验证 schema
 * @returns 验证成功返回数据，失败返回 NextResponse 错误响应
 */
export function validateRequest<T>(
  data: unknown,
  schema: ZodSchema
): T | NextResponse {
  try {
    return schema.parse(data) as T
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.errors[0]?.message || '参数验证失败'
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message,
          details: error.errors,
        },
        { status: 422 }
      )
    }
    return NextResponse.json(
      {
        error: 'VALIDATION_ERROR',
        message: '参数验证失败',
      },
      { status: 422 }
    )
  }
}

/**
 * 验证文件大小和类型
 */
export interface FileValidationOptions {
  maxSize?: number // 字节
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

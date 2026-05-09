import { Prisma } from '@/generated/prisma/client'

export function isUniqueConstraintError(error: unknown, field?: string | string[]): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false
  }

  if (!field) {
    return true
  }

  const fields = Array.isArray(field) ? field : [field]
  const target = Array.isArray(error.meta?.target)
    ? error.meta.target
    : typeof error.meta?.target === 'string'
      ? [error.meta.target]
      : []

  return fields.every((item) => target.includes(item))
}

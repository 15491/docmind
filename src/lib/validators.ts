import { z } from 'zod'

const idSchema = z.string().cuid('无效的 ID')
const emailSchema = z.string().trim().toLowerCase().email('邮箱格式不正确')
const codeSchema = z.string().trim().min(1, '请输入验证码')
const passwordSchema = z.string().min(8, '密码至少 8 位')

function parseOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value === 'string') {
    return Number(value)
  }

  return value
}

function boundedQueryInt(label: string, min: number, max: number, defaultValue: number) {
  return z.preprocess(
    parseOptionalNumber,
    z
      .number({ invalid_type_error: `${label}必须是数字` })
      .int(`${label}必须是整数`)
      .min(min, `${label}不能小于 ${min}`)
      .max(max, `${label}不能大于 ${max}`)
      .default(defaultValue)
  )
}

function optionalBoundedNumber(
  label: string,
  config: { min: number; max: number; int?: boolean }
) {
  let schema = z
    .number({ invalid_type_error: `${label}必须是数字` })
    .min(config.min, `${label}不能小于 ${config.min}`)
    .max(config.max, `${label}不能大于 ${config.max}`)

  if (config.int) {
    schema = schema.int(`${label}必须是整数`)
  }

  return z.preprocess(parseOptionalNumber, schema.optional())
}

export const registerSchema = z.object({
  name: z.string().trim().min(1, '请输入昵称'),
  email: emailSchema,
  password: passwordSchema,
  code: codeSchema,
})

export const sendCodeSchema = z.object({
  email: emailSchema,
  purpose: z.enum(['register', 'reset-password', 'change-email'], {
    required_error: '缺少验证码用途',
    invalid_type_error: '验证码用途不正确',
  }),
})

export const resetPasswordSchema = z.object({
  email: emailSchema,
  code: codeSchema,
  newPassword: passwordSchema,
})

export const createKbSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, '知识库名称至少需要 2 个字符')
    .max(100, '知识库名称不能超过 100 个字符'),
})

export const updateKbSchema = createKbSchema

export const idParamSchema = z.object({
  id: idSchema,
})

export const uploadFileSchema = z.object({
  kbId: idSchema,
})

export const chatSchema = z.object({
  question: z.string().trim().min(1, '问题不能为空'),
  kbId: idSchema,
  sessionId: idSchema.optional(),
})

export const searchSchema = z.object({
  query: z.string().trim().min(1, '搜索关键词不能为空'),
  topK: optionalBoundedNumber('topK', { min: 1, max: 50, int: true }),
})

export const documentsStatusQuerySchema = z.object({
  kbId: idSchema,
  cursor: idSchema.optional(),
  limit: boundedQueryInt('limit', 1, 100, 20),
})

export const sessionsQuerySchema = z.object({
  kbId: idSchema,
  cursor: idSchema.optional(),
  limit: boundedQueryInt('limit', 1, 50, 20),
})

export const kbListQuerySchema = z.object({
  page: boundedQueryInt('page', 1, 100000, 1),
  pageSize: boundedQueryInt('pageSize', 1, 48, 12),
})

export const batchDeleteDocumentsSchema = z.object({
  ids: z.array(idSchema).min(1, 'ids 必须是非空数组'),
})

export const changeEmailSchema = z.object({
  email: emailSchema,
  code: codeSchema,
})

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '请输入当前密码').optional(),
  newPassword: z.string().min(8, '新密码至少 8 位'),
})

export const ragConfigSchema = z.object({
  chunkSize: optionalBoundedNumber('chunkSize', { min: 100, max: 2000, int: true }),
  overlap: optionalBoundedNumber('overlap', { min: 0, max: 200, int: true }),
  topK: optionalBoundedNumber('topK', { min: 1, max: 20, int: true }),
  temperature: optionalBoundedNumber('temperature', { min: 0, max: 1 }),
})

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1, '昵称不能为空').optional(),
    zhipuApiKey: z.string().transform((value) => value.trim()).optional(),
    ragConfig: ragConfigSchema.optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.zhipuApiKey !== undefined || data.ragConfig !== undefined,
    { message: '无可更新字段' }
  )

export type RegisterInput = z.infer<typeof registerSchema>
export type SendCodeInput = z.infer<typeof sendCodeSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type CreateKbInput = z.infer<typeof createKbSchema>
export type ChatInput = z.infer<typeof chatSchema>
export type SearchInput = z.infer<typeof searchSchema>
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>

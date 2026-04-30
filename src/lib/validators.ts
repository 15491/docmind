import { z } from 'zod'

// 用户相关
export const registerSchema = z.object({
  name: z.string().min(1, '请填写昵称').trim(),
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(8, '密码至少 8 位'),
  code: z.string().min(1, '请输入验证码'),
})

export const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码'),
})

// 知识库相关
export const createKbSchema = z.object({
  name: z.string().min(2, '知识库名称至少 2 个字符').max(100, '知识库名称过长').trim(),
})

export const kbIdSchema = z.object({
  id: z.string().uuid('无效的知识库 ID'),
})

// 文件上传相关
export const uploadFileSchema = z.object({
  kbId: z.string().min(1, '缺少知识库 ID'),
  // File 对象不能直接用 zod 验证，需要在 request handler 中分别验证
})

// 聊天相关
export const chatSchema = z.object({
  question: z.string().min(1, '问题不能为空').trim(),
  kbId: z.string().min(1, '缺少知识库 ID'),
  sessionId: z.string().optional(),
})

// 文档相关
export const documentsStatusSchema = z.object({
  kbId: z.string().min(1, '缺少知识库 ID'),
})

export const deleteDocumentSchema = z.object({
  id: z.string().uuid('无效的文档 ID'),
})

// 会话相关
export const sessionsSchema = z.object({
  kbId: z.string().min(1, '缺少知识库 ID'),
})

export const sessionMessagesSchema = z.object({
  id: z.string().uuid('无效的会话 ID'),
})

// 邮箱验证码
export const sendCodeSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  type: z.enum(['register', 'login'], { message: '无效的验证码类型' }),
})

// 类型导出
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateKbInput = z.infer<typeof createKbSchema>
export type ChatInput = z.infer<typeof chatSchema>
export type SendCodeInput = z.infer<typeof sendCodeSchema>

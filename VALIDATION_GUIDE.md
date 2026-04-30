# 参数校验指南

## 📊 当前状态

### ❌ 现有做法（手动校验）
```typescript
// 重复、冗长、容易出错
if (!name || typeof name !== "string" || name.trim().length === 0)
  return NextResponse.json({ error: "请填写昵称" }, { status: 422 })

if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  return NextResponse.json({ error: "邮箱格式不正确" }, { status: 422 })
```

**问题：**
- 代码重复多
- 容易遗漏某些字段
- 难以维护
- 类型推断差

### ✅ 改进做法（使用 Zod）
```typescript
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(1, '请填写昵称').trim(),
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(8, '密码至少 8 位'),
  code: z.string().min(1, '请输入验证码'),
})

// 在 API 中使用
const validation = validateRequest<RegisterInput>(body, registerSchema)
if (validation instanceof NextResponse) return validation

const { name, email, password, code } = validation
```

**优势：**
- ✅ 代码简洁清晰
- ✅ 自动生成 TypeScript 类型
- ✅ 统一的错误处理
- ✅ 易于维护和扩展

---

## 🎯 上传文件校验现状

### 当前已有的校验（route.ts）
```typescript
✅ 文件存在性检查
✅ kbId 存在性检查
✅ 文件大小限制（10MB）
✅ 文件类型白名单（PDF / TXT / Markdown）
✅ 知识库归属权检查
```

### 改进方案（route-improved.example.ts）
```typescript
// 使用统一的文件校验函数
const fileError = validateFile(file, {
  maxSize: 10 * 1024 * 1024,
  allowedTypes: ALLOWED_FILE_TYPES,
})

if (fileError) {
  return NextResponse.json(
    { error: 'INVALID_FILE', message: fileError },
    { status: 422 }
  )
}
```

---

## 📁 新增文件

### 1. `src/lib/validators.ts`
定义所有 API 的 Zod Schema

```typescript
export const registerSchema = z.object({
  name: z.string().min(1).trim(),
  email: z.string().email(),
  password: z.string().min(8),
  code: z.string().min(1),
})

// 自动生成类型
export type RegisterInput = z.infer<typeof registerSchema>
```

### 2. `src/lib/validate-request.ts`
统一的验证工具函数

```typescript
// 验证请求数据
validateRequest<T>(data, schema)

// 验证文件
validateFile(file, { maxSize, allowedTypes })
```

### 3. 示例文件（供参考）
- `src/app/api/upload/route-improved.example.ts`
- `src/app/api/chat/route-improved.example.ts`

---

## 🚀 使用指南

### Step 1：定义 Schema
```typescript
// validators.ts
export const createKbSchema = z.object({
  name: z.string()
    .min(2, '名称至少 2 个字符')
    .max(100, '名称过长')
    .trim(),
})

export type CreateKbInput = z.infer<typeof createKbSchema>
```

### Step 2：在 API 路由中使用
```typescript
import { validateRequest } from '@/lib/validate-request'
import { createKbSchema, type CreateKbInput } from '@/lib/validators'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json(
      { error: 'INVALID_REQUEST' },
      { status: 400 }
    )
  }

  // 一行代码完成验证
  const validation = validateRequest<CreateKbInput>(body, createKbSchema)
  if (validation instanceof NextResponse) return validation

  const { name } = validation
  // 现在 name 的类型已被推断为 string
}
```

### Step 3：文件验证
```typescript
import { validateFile } from '@/lib/validate-request'

const fileError = validateFile(file, {
  maxSize: 10 * 1024 * 1024,
  allowedTypes: ['application/pdf', 'text/plain'],
})

if (fileError) {
  return NextResponse.json(
    { error: 'INVALID_FILE', message: fileError },
    { status: 422 }
  )
}
```

---

## 📋 Zod Schema 常用方法

### 字符串
```typescript
z.string()
  .min(1, '不能为空')
  .max(100, '过长')
  .email('邮箱格式不正确')
  .regex(/^[a-z]+$/, '只能包含小写字母')
  .trim() // 自动去除空格
  .optional() // 可选字段
```

### 数字
```typescript
z.number()
  .min(0, '不能为负')
  .max(100, '超出范围')
  .int('必须是整数')
```

### 对象
```typescript
z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
})
  .strict() // 禁止额外字段
  .partial() // 所有字段可选
```

### 数组
```typescript
z.array(z.string())
  .min(1, '至少选择一个')
  .max(10, '最多选择 10 个')
```

### 条件验证
```typescript
const schema = z.object({
  type: z.enum(['email', 'phone']),
  value: z.string(),
}).refine(
  (data) => {
    if (data.type === 'email') {
      return /^[^\s@]+@[^\s@]+$/.test(data.value)
    }
    return /^\d{10}$/.test(data.value)
  },
  { message: '格式不匹配' }
)
```

---

## 🔒 安全最佳实践

### 1. 始终验证用户输入
```typescript
// ❌ 不要这样做
const id = req.query.id

// ✅ 要这样做
const validation = validateRequest({ id: req.query.id }, z.object({
  id: z.string().uuid('无效的 ID'),
}))
```

### 2. 限制文件大小和类型
```typescript
const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
]

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
```

### 3. 验证数据库关联
```typescript
// 验证知识库归属权
if (kb.userId !== session.user.id) {
  return NextResponse.json(
    { error: 'FORBIDDEN' },
    { status: 403 }
  )
}
```

### 4. 不要暴露内部错误
```typescript
// ❌ 错误做法
catch (error) {
  return NextResponse.json(
    { error: error.message }, // 泄露敏感信息
    { status: 500 }
  )
}

// ✅ 正确做法
catch (error) {
  console.error('[/api/endpoint] Error:', error)
  return NextResponse.json(
    { error: 'INTERNAL_ERROR', message: '服务器错误' },
    { status: 500 }
  )
}
```

---

## 📦 迁移步骤

要将现有的手动校验转换为 Zod：

### 1. 先在 `validators.ts` 中定义所有 schema
### 2. 逐个 API 路由迁移，使用 `route-improved.example.ts` 作为参考
### 3. 删除手动校验代码，替换为 `validateRequest()`
### 4. 测试所有端点确保行为一致
### 5. 删除 `.example.ts` 文件

---

## 🧪 测试 Zod Schema

```typescript
// 测试示例
import { registerSchema } from '@/lib/validators'

// 应该通过
registerSchema.parse({
  name: 'John',
  email: 'john@example.com',
  password: '12345678',
  code: '123456',
})

// 应该抛出错误
try {
  registerSchema.parse({
    name: '',
    email: 'invalid',
    password: '123', // 太短
    code: '123456',
  })
} catch (error) {
  console.log(error.errors)
  // [
  //   { path: ['name'], message: '请填写昵称' },
  //   { path: ['email'], message: 'Invalid email' },
  //   { path: ['password'], message: '密码至少 8 位' },
  // ]
}
```

---

## 📚 相关文件

- 新的 Zod schemas: `src/lib/validators.ts`
- 验证工具函数: `src/lib/validate-request.ts`
- 改进示例（upload）: `src/app/api/upload/route-improved.example.ts`
- 改进示例（chat）: `src/app/api/chat/route-improved.example.ts`

---

**下一步：** 安装 zod，逐个迁移 API 路由使用新的验证方案

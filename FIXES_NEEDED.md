# 代码修复清单

## 🔴 高优先级修复 (必须)

### Fix #1: Redis 连接配置
**文件**: `src/lib/redis.ts`  
**问题**: maxRetriesPerRequest 应该为 1，现在是 null  
**当前代码**:
```typescript
export const redis = globalForRedis.redis ?? new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,  // ❌ 错误
  connectTimeout: 3000,
  lazyConnect: false,
})
```

**修复方案**:
```typescript
export const redis = globalForRedis.redis ?? new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 1,  // ✅ 正确
  connectTimeout: 3000,
  lazyConnect: false,
})
```

**原因**: null 会导致失败重试最多 30 秒，造成 API 超时

---

### Fix #2: 修复 API Key null 安全
**文件**: `src/app/api/chat/route.ts`  
**问题**: kb.user 可能为 null  
**当前代码** (第 50-71 行):
```typescript
const kb = await prisma.knowledgeBase.findUnique({
  where: { id: kbId },
  include: { user: { select: { zhipuApiKey: true } } },
})

if (!kb) {
  return NextResponse.json(...)
}

if (kb.userId !== session.user.id) {
  return NextResponse.json(...)
}

const userApiKey = kb.user.zhipuApiKey  // ❌ kb.user 可能为 null
```

**修复方案**:
```typescript
const kb = await prisma.knowledgeBase.findUnique({
  where: { id: kbId },
  include: { user: { select: { zhipuApiKey: true } } },
})

if (!kb) {
  return NextResponse.json(...)
}

if (kb.userId !== session.user.id) {
  return NextResponse.json(...)
}

// ✅ 添加 null 检查
if (!kb.user) {
  return NextResponse.json(
    { error: 'INTERNAL_ERROR', message: '用户信息已删除' },
    { status: 500 }
  )
}

const userApiKey = kb.user.zhipuApiKey
```

---

### Fix #3: 修复 Rate Limit 竞态条件
**文件**: `src/lib/rate-limit.ts`  
**问题**: count === 1 时设置 expire 不原子，在高并发下可能失败  

**当前代码**:
```typescript
export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number
): Promise<{ ok: boolean; remaining: number }> {
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, windowSeconds)  // ❌ 非原子操作
  return { ok: count <= max, remaining: Math.max(0, max - count) }
}
```

**修复方案 (推荐)**:
```typescript
export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number
): Promise<{ ok: boolean; remaining: number }> {
  // 使用 Lua 脚本保证原子性
  const script = `
    local count = redis.call('INCR', KEYS[1])
    if count == 1 then
      redis.call('EXPIRE', KEYS[1], ARGV[1])
    end
    return count
  `
  
  const count = await redis.eval(script, 1, key, windowSeconds) as number
  return { ok: count <= max, remaining: Math.max(0, max - count) }
}
```

**备选方案** (更简单):
```typescript
export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number
): Promise<{ ok: boolean; remaining: number }> {
  // 如果 key 不存在，INCR 会同时创建和设置为 1
  // 然后立即设置过期时间，虽然不完美但简化了逻辑
  await redis.incr(key)
  // 总是设置过期时间（效率稍低但更安全）
  await redis.expire(key, windowSeconds)
  
  const count = await redis.get(key)
  const numCount = count ? parseInt(count) : 0
  
  return { ok: numCount <= max, remaining: Math.max(0, max - numCount) }
}
```

---

### Fix #4: 搜索 API 添加用户 API Key 支持
**文件**: `src/app/api/search/route.ts`  
**问题**: 搜索时没有使用用户自定义的 API Key  

**当前代码** (第 51 行):
```typescript
// ❌ 没有传递用户 API Key
const queryEmbedding = await embedText(query.trim())
```

**修复方案**:
```typescript
// 获取用户信息（包括 API Key）
const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { zhipuApiKey: true },
})

// ✅ 传递用户 API Key
const queryEmbedding = await embedText(query.trim(), user?.zhipuApiKey)
```

---

## 🟡 中优先级优化

### Optimization #1: 创建统一 API Key 获取工具
**文件**: 新建 `src/lib/get-user-api-key.ts`

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function getUserApiKey(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { zhipuApiKey: true },
  })
  return user?.zhipuApiKey ?? null
}
```

然后在各处使用:
```typescript
// 在 /api/chat 中
const userApiKey = await getUserApiKey(session.user.id)

// 在 /api/search 中  
const userApiKey = await getUserApiKey(session.user.id)
```

---

### Optimization #2: 统一错误响应格式
创建 `src/lib/api-response.ts`:

```typescript
export function error(code: string, message: string, status: number = 400) {
  return {
    response: { error: code, message },
    status
  }
}

// 使用方式
return NextResponse.json(
  ...error('RATE_LIMITED', '操作过于频繁，请稍后再试', 429)
)
```

---

## ✅ 已验证安全的部分

| 检查项 | 状态 | 备注 |
|--------|------|------|
| 认证检查 | ✅ | 所有私有 API 都有 auth() 检查 |
| 权限验证 | ✅ | 知识库/会话/文档都验证所有权 |
| SQL 注入防护 | ✅ | 使用 Prisma，已参数化查询 |
| API Key 隐藏 | ✅ | GET /api/user 正确遮挡 key |
| 文件上传验证 | ✅ | 文件大小、类型限制已实现 |
| 会话隔离 | ✅ | 获取会话消息时验证归属权 |
| 密码安全 | ✅ | 使用 bcryptjs，哈希密码修改 |

---

## 测试清单

修复完成后应该测试：

- [ ] Redis 连接失败时 API 响应速度不超过 5 秒
- [ ] 并发发送多个 chat 请求，rate limit 正常工作
- [ ] 用户 API Key 为空时，搜索 API 使用服务器环境变量
- [ ] 用户 API Key 不为空时，搜索 API 使用用户自定义 key
- [ ] 删除用户后，相关知识库操作返回 500
- [ ] 跨用户访问会话返回 403 Forbidden

---

## 修复优先级建议

**第一阶段** (今天):
1. Fix #1 - Redis 配置 (5 分钟)
2. Fix #2 - API Key null 检查 (10 分钟)
3. Fix #3 - Rate limit (20 分钟)

**第二阶段** (本周):
4. Fix #4 - 搜索 API Key 支持 (15 分钟)
5. Optimization #1 - 统一工具函数 (30 分钟)
6. Optimization #2 - 错误响应格式 (20 分钟)

**预计总耗时**: ~100 分钟

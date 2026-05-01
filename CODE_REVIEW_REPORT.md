# 项目代码扫描报告

**扫描日期**: 2026-05-01  
**总体状态**: ⚠️ 发现 **7 个** 重要问题，**3 个** 优化建议

---

## 🔴 严重问题 (需立即修复)

### 1. Redis 连接配置回退问题
**文件**: `src/lib/redis.ts:6`  
**问题**: `maxRetriesPerRequest` 从 `1` 改为 `null`
```typescript
// ❌ 问题：改为 null 会导致失败重试 30 秒
maxRetriesPerRequest: null,
```
**影响**: 失败连接会卡住 30 秒，导致 API 超时  
**修复**: 改回 `maxRetriesPerRequest: 1`

---

### 2. API Key 读取可能为 null
**文件**: `src/app/api/chat/route.ts:70`  
**问题**:
```typescript
const kb = await prisma.knowledgeBase.findUnique({
  where: { id: kbId },
  include: { user: { select: { zhipuApiKey: true } } },
})

// 这里 kb.user 可能为 null
const userApiKey = kb.user.zhipuApiKey  // ❌ 可能 null 错误
```
**影响**: 如果 user 为空，会导致代码崩溃  
**修复**: 添加 null 检查

---

### 3. 搜索 API 缺少用户 API Key
**文件**: `src/app/api/search/route.ts:51`  
**问题**:
```typescript
// ❌ 没有从用户设置中获取 API Key
const queryEmbedding = await embedText(query.trim())
```
**影响**: 跨知识库搜索必须依赖环境变量，无法使用用户自定义 API Key  
**建议**: 应该获取用户 API Key 并传递

---

### 4. ~~缺少 API 路由~~ ✅ 已验证存在
**所有需要的 API 路由都已实现**:
- ✅ `POST /api/auth/check-email` 存在
- ✅ `GET /api/sessions/{sessionId}/messages` 存在并有权限检查
- ✅ `DELETE /api/user/kbs` 存在
- ✅ `PATCH /api/user/password` 存在并有密码验证

**结论**: 此问题已解决 ✅

---

### 5. rate-limit 逻辑缺陷
**文件**: `src/lib/rate-limit.ts:12-13`  
**问题**:
```typescript
const count = await redis.incr(key)
if (count === 1) await redis.expire(key, windowSeconds)
```
**缺陷**:
- 只在首次 (count === 1) 时设置过期时间
- 如果 redis 的 expire 调用失败，该 key 永远不会过期
- 竞态条件：多个请求同时到达时，expire 可能不被执行

**建议**: 改为 `INCREX` 原子操作或使用 `getex`

---

## 🟡 重要问题

### 6. API Key 不应该在 PATCH 请求返回
**文件**: `src/app/api/user/route.ts:48-52`  
**问题**:
```typescript
const user = await prisma.user.update({
  where: { id: session.user.id },
  data,
  select: { id: true, name: true, email: true },
})
return NextResponse.json({ user })
```
**安全性**: 虽然保存操作正确，但应该确保不会泄露 API Key  
**检查**: 上面的 select 是安全的 ✅

---

### 7. ✅ 会话归属权验证已实现
**文件**: `/api/sessions/[id]/messages/route.ts:36`  
**已验证**: 路由正确检查 `chatSession.knowledgeBase.userId !== session.user.id`
```typescript
if (chatSession.knowledgeBase.userId !== session.user.id) {
  return NextResponse.json(
    { error: 'FORBIDDEN', message: '无权访问此会话' },
    { status: 403 }
  )
}
```
**结论**: 安全验证完善 ✅

---

## 🔵 优化建议

### 建议 1: 统一 API Key 传递流程
目前有多个地方获取用户 API Key：
- `/api/chat` ✅ 有
- `/api/search` ❌ 没有  
- `worker` ✅ 有

**建议**: 创建统一的 `getApiKey()` 工具函数

---

### 建议 2: 错误处理不一致
有些路由返回 `{ error: 'CODE' }`, 有些返回 `{ error: 'CODE', message: 'msg' }`

**建议**: 统一错误响应格式

---

### 建议 3: 缺少 API 路由文档
新增了多个 API 端点，建议添加：
- `POST /api/auth/check-email`
- `GET/PATCH /api/sessions/{sessionId}/messages`
- `PATCH /api/user/password`

---

## ✅ 已验证安全的部分

| 特性 | 状态 | 备注 |
|------|------|------|
| SQL 注入防护 | ✅ | 使用 Prisma $queryRaw 时已参数化 |
| API Key 隐藏 | ✅ | GET /api/user 返回已遮挡的 key |
| 认证检查 | ✅ | 所有私有 API 都有 auth() 检查 |
| 权限验证 | ✅ | 知识库操作都验证 kb.userId |
| 速率限制 | ⚠️ | 已实现，但有并发缺陷 |
| 文件大小限制 | ✅ | 10MB 限制已实现 |

---

## 📋 待修复任务清单

- [ ] **高优先级**:
  - [ ] 修复 Redis maxRetriesPerRequest 配置
  - [ ] 修复 kb.user 可能为 null 的问题
  - [ ] 添加 /api/sessions/{sessionId}/messages 路由
  - [ ] 修复 rate-limit 竞态条件

- [ ] **中优先级**:
  - [ ] 搜索 API 添加用户 API Key 支持
  - [ ] 验证所有缺失的 API 路由
  - [ ] 统一错误响应格式

- [ ] **低优先级**:
  - [ ] 创建统一的 getApiKey() 工具函数
  - [ ] 完善 API 文档

---

## 🎯 总体结论

项目的**架构和安全防护都很完善**，但存在：
1. ⚠️ 一些关键的 null 检查缺失
2. ⚠️ 几个重要 API 路由缺失
3. ⚠️ Redis 配置退化问题

**建议修复上述 7 个问题后，项目应该达到可用状态**。

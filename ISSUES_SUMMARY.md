# 项目问题总结表

> **最后更新：2026-04-30** | **全面的问题检查和修复建议**

---

## 📊 问题分类统计

```
总问题数：8 个
├── 严重问题（P0）：3 个  ⚠️ 影响功能
├── 中等问题（P1）：3 个  ⚡ 需要优化
├── 轻微问题（P2）：2 个  💡 可选改进
```

---

## 🎯 所有问题一览表

### 类别 1：模拟数据问题（5 个）

| # | 问题 | 位置 | 类型 | 影响 | 修复方案 |
|----|------|------|------|------|---------|
| **P0-1** | MOCK_KBS 字段不匹配 | `dashboard/constants.ts` | 数据 | Dashboard 无法显示知识库 | 删除 MOCK，用 API |
| **P0-2** | MOCK_SESSIONS 仍在使用 | `chat/layout.tsx` | 数据 | 会话列表显示 MOCK | 改用 `/api/sessions` |
| **P0-3** | MOCK_KB_NAMES 硬编码 | `kb/[id]/page.tsx` | 数据 | 新知识库无法显示名称 | 改用 API 获取 |
| **P1-4** | MOCK_DOCS 字段错误 | `kb/[id]/constants.ts` | 数据 | 文档列表字段错误 | 删除 MOCK，用 hook |
| **P1-5** | MOCK_RESULTS 完全 MOCK | `search/hooks.ts` | 功能 | 搜索完全不工作 | 实现搜索 API（可后做） |

### 类别 2：字段名不一致（3 个）

| # | 问题 | 位置 | 类型 | 影响 | 修复方案 |
|----|------|------|------|------|---------|
| **P1-6** | doc.name → fileName | 多个文件 | 字段 | 代码混乱 | 全局替换 |
| **P1-7** | doc.size → fileSize | 多个文件 | 字段 | 大小显示错误 | 全局替换 + 格式化 |
| **P1-8** | kb.docCount → documentCount | 多个文件 | 字段 | 数量显示错误 | 全局替换 |

---

## 📋 详细问题说明

### 问题 P0-1：MOCK_KBS 字段不匹配

**当前：**
```typescript
// dashboard/constants.ts
export const MOCK_KBS = [
  { id: "1", name: "...", docCount: 3, updatedAt: "2 天前" }
]

// API 返回
{ id: "1", name: "...", documentCount: 3, createdAt: "2026-04-30..." }
```

**结果：** 页面显示 "undefined 篇文档"

**修复：** 删除 MOCK_KBS，使用 `useKbList()` hook

**工作量：** 20 分钟

---

### 问题 P0-2：MOCK_SESSIONS 仍在使用

**当前：**
```typescript
// chat/layout.tsx
import { MOCK_SESSIONS } from "./constants"
const grouped = MOCK_SESSIONS.reduce(...)  // 永远显示同样的会话
```

**结果：** 用户创建的新会话不会显示

**修复：** 改用 `/api/sessions` API

**工作量：** 30 分钟

---

### 问题 P0-3：MOCK_KB_NAMES 硬编码

**当前：**
```typescript
// kb/[id]/page.tsx
const kbName = MOCK_KB_NAMES[id] ?? "知识库"  // 只有 id=1,2 能显示
```

**结果：** 新知识库只显示 "知识库" 占位符

**修复：** 从 API 获取真实知识库信息

**工作量：** 1 小时

---

### 问题 P1-4：MOCK_DOCS 字段错误

**当前：**
```typescript
// kb/[id]/constants.ts
{ id: "1", name: "api.pdf", size: "2.3 MB", uploadedAt: "2 天前" }

// 但预览功能用 doc.name 查找
const preview = MOCK_PREVIEW[doc.name]  // API 返回的是 fileName
```

**结果：** 预览功能无法工作

**修复：** 删除 MOCK_DOCS，改用 `useDocList()` hook

**工作量：** 1 小时

---

### 问题 P1-5：搜索完全是 MOCK

**当前：**
```typescript
// search/hooks.ts
export function useSearch() {
  const [results, setResults] = useState([])
  const handleSearch = () => {
    setResults(MOCK_RESULTS)  // 永远返回同样的结果
  }
}
```

**结果：** 搜索功能完全不工作

**修复：** 实现真实搜索 API（可以后做）

**工作量：** 2-3 小时（可延后）

---

### 问题 P1-6/7/8：字段名不一致

**当前混用的字段名：**
```typescript
// ❌ MOCK 数据用的字段
doc.name         // 应该是 fileName
doc.size         // 应该是 fileSize
doc.uploadedAt   // 应该是 createdAt
kb.docCount      // 应该是 documentCount
kb.updatedAt     // 应该是 createdAt

// 导致代码混乱
<p>{doc.name}</p>  // 有时候能用，有时候 undefined
```

**修复：** 统一使用 API 返回的字段名

**工作量：** 1-2 小时（全局替换 + 格式化）

---

## 🔧 库使用情况检查

### ✅ 正常使用的库

| 库 | 使用处 | 状态 |
|----|--------|------|
| `next` | 整个项目 | ✅ 正常 |
| `react` | 整个项目 | ✅ 正常 |
| `typescript` | 整个项目 | ✅ 正常 |
| `prisma` | ORM 核心 | ✅ 正常 |
| `next-auth` | 认证系统 | ✅ 正常 |
| `ioredis` | Redis 连接 | ✅ 正常 |
| `bcryptjs` | 密码加密 | ✅ 正常 |
| `lucide-react` | 图标 | ✅ 正常（使用 6+ 处） |
| `radix-ui` | UI 基础 | ✅ 正常（使用 6 处） |
| `bullmq` | 消息队列（新增） | ✅ 正常 |
| `pdf-parse` | PDF 解析（新增） | ✅ 正常 |
| `remark` | Markdown 解析（新增） | ✅ 正常 |
| `zod` | 参数校验（新增，可选） | ✅ 正常 |

### ⚠️ 库使用建议

1. **组件库一致性**
   - 当前混用 `radix-ui` 和 `shadcn/ui`
   - 建议统一为 `shadcn/ui`（基于 radix-ui）

2. **没有发现严重的库使用问题**
   - 所有导入都在正确使用
   - 没有发现明显的未使用导入

---

## 🚀 修复优先级和工作量

### 立即修复（P0）- 2-3 小时

```
问题 P0-1, P0-2, P0-3
涉及文件：dashboard, kb, chat 页面
影响：核心功能无法工作
修复后效果：Dashboard 和 Chat 页面能正常显示真实数据
```

### 本周修复（P1）- 2-3 小时

```
问题 P1-4, P1-6, P1-7, P1-8
涉及文件：多个组件和 constants
影响：代码混乱，某些功能有问题
修复后效果：代码清晰一致，所有字段正确映射
```

### 可选优化（P2）- 2-3 小时（可延后）

```
问题 P1-5
涉及文件：search 相关
影响：搜索功能无法用
修复后效果：用户可以搜索文档
```

---

## 📝 修复检查清单

### 修复前准备
- [ ] 创建新分支 `git checkout -b cleanup/mock-data`
- [ ] 备份当前状态 `git add -A && git commit -m "backup before cleanup"`

### P0 修复（必做）
- [ ] 删除 MOCK_KBS 和 RECENT_SESSIONS
- [ ] 删除 MOCK_KB_NAMES 和 MOCK_DOCS
- [ ] 删除 MOCK_SESSIONS 和 MOCK_KB_INFO
- [ ] 更新 dashboard/page.tsx 使用 API
- [ ] 更新 kb/[id]/page.tsx 使用 API
- [ ] 更新 chat/layout.tsx 使用 API
- [ ] 本地测试 Dashboard 和 Chat 页面

### P1 修复（应做）
- [ ] 全局替换字段名
  - [ ] doc.name → doc.fileName
  - [ ] doc.size → doc.fileSize
  - [ ] doc.uploadedAt → doc.createdAt
  - [ ] kb.docCount → kb.documentCount
  - [ ] kb.updatedAt → kb.createdAt
- [ ] 更新所有日期格式化
- [ ] 更新所有文件大小格式化
- [ ] 更新 components.tsx 中的引用
- [ ] 本地完整流程测试

### P2 修复（可选）
- [ ] 实现搜索 API（可延后做）
- [ ] 删除 search 中的 MOCK_RESULTS

### 修复后验证
- [ ] 没有控制台红色错误
- [ ] 没有 "undefined" 在页面上显示
- [ ] Dashboard 正常显示知识库列表
- [ ] 创建知识库能正常工作
- [ ] 删除知识库能正常工作
- [ ] 上传文件能正常工作
- [ ] Chat 页面显示会话列表
- [ ] 新会话能正常创建
- [ ] 所有日期/数字格式化正确

### 修复后清理
- [ ] 删除 .example.ts 文件
- [ ] 提交修改 `git commit -m "cleanup: remove mock data and use real APIs"`
- [ ] 推送分支 `git push origin cleanup/mock-data`

---

## 📊 总体进度

```
当前状态（实现完后）
├── ✅ API 路由：100% 完成
├── ✅ 前端 hooks：100% 完成
├── ✅ 依赖安装：100% 完成
├── ⏳ 模拟数据清理：0% 完成 <- 需要做
├── ⏳ 字段映射修复：0% 完成 <- 需要做
└── ⏳ 参数校验迁移（可选）：0% 完成

预计总工作量：6-9 小时
└── P0 修复（必做）：2-3 小时
└── P1 修复（应做）：2-3 小时
└── P2 修复（可选）：2-3 小时
└── 测试和调试：1-2 小时
```

---

## 🎯 建议执行计划

### 第 1 天（3 小时）- 清理 MOCK 数据
1. 删除所有 MOCK_* 常量定义
2. 更新页面导入，移除 MOCK 使用
3. 改用 API hooks 获取数据
4. 基础测试验证

### 第 2 天（2-3 小时）- 字段映射和格式化
1. 全局替换字段名称
2. 添加日期和文件大小格式化
3. 修复预览功能
4. 完整功能测试

### 第 3 天（可选，1-2 小时）
1. 实现搜索功能
2. 代码审查和优化
3. 性能检查
4. 提交 PR

---

**状态：** 📋 已识别，等待执行  
**下一步：** 按照修复清单逐步修复问题

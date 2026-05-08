import assert from 'node:assert/strict'
import test from 'node:test'
import { z } from 'zod'
import * as validation from '../src/lib/validate-request.ts'
import * as validators from '../src/lib/validators.ts'

const {
  isValidationErrorResponse,
  parseJsonBody,
  validateFile,
  validateRequest,
  validateRouteParams,
  validateSearchParams,
} = validation

const {
  batchDeleteDocumentsSchema,
  changePasswordSchema,
  documentsStatusQuerySchema,
  kbListQuerySchema,
  searchSchema,
  sendCodeSchema,
  updateUserSchema,
} = validators

test('validateRequest 返回解析后的数据', () => {
  const schema = z.object({
    name: z.string().trim().min(1),
  })

  const result = validateRequest({ name: '  DocMind  ' }, schema)
  assert.deepEqual(result, { name: 'DocMind' })
})

test('validateRequest 校验失败时返回统一 422 响应', async () => {
  const schema = z.object({
    name: z.string().min(2, '名称太短'),
  })

  const result = validateRequest({ name: 'a' }, schema)
  assert.equal(isValidationErrorResponse(result), true)
  assert.equal(result.status, 422)

  const payload = await result.json()
  assert.equal(payload.ok, false)
  assert.equal(payload.code, 'INVALID_INPUT')
  assert.equal(payload.message, '名称太短')
})

test('parseJsonBody 非法 JSON 时返回统一错误', async () => {
  const req = new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{bad json}',
  })

  const result = await parseJsonBody(req, z.object({ name: z.string() }))
  assert.equal(isValidationErrorResponse(result), true)
  assert.equal(result.status, 422)

  const payload = await result.json()
  assert.equal(payload.code, 'INVALID_INPUT')
})

test('validateSearchParams 支持默认值和数字预处理', () => {
  const result = validateSearchParams(new URLSearchParams(), kbListQuerySchema)
  assert.deepEqual(result, { page: 1, pageSize: 12 })
})

test('validateRouteParams 支持异步 params', async () => {
  const schema = z.object({
    id: z.string().min(1),
  })

  const result = await validateRouteParams(Promise.resolve({ id: 'abc' }), schema)
  assert.deepEqual(result, { id: 'abc' })
})

test('validateFile 覆盖空文件、类型和大小校验', () => {
  assert.equal(validateFile(null), '未提供文件')

  const invalidTypeFile = new File(['hello'], 'demo.txt', { type: 'text/plain' })
  assert.equal(
    validateFile(invalidTypeFile, { allowedTypes: ['application/pdf'] }),
    '不支持的文件类型: text/plain'
  )

  const tooLargeFile = new File(['hello'], 'demo.pdf', { type: 'application/pdf' })
  Object.defineProperty(tooLargeFile, 'size', { value: 6 * 1024 * 1024 })
  assert.equal(
    validateFile(tooLargeFile, { maxSize: 5 * 1024 * 1024 }),
    '文件大小超过 5MB 限制'
  )
})

test('searchSchema 统一处理 trim 和 topK 数字预处理', () => {
  const result = searchSchema.parse({ query: '  hello  ', topK: '3' })
  assert.deepEqual(result, { query: 'hello', topK: 3 })
})

test('sendCodeSchema 会统一邮箱大小写和空白', () => {
  const result = sendCodeSchema.parse({
    email: '  USER@Example.COM  ',
    purpose: 'register',
  })

  assert.deepEqual(result, {
    email: 'user@example.com',
    purpose: 'register',
  })
})

test('documentsStatusQuerySchema 解析 limit 并保留 cursor', () => {
  const result = documentsStatusQuerySchema.parse({
    kbId: 'cmaaaaaaaaaaaaaaaaaaaaaaaa',
    cursor: 'cmbbbbbbbbbbbbbbbbbbbbbb',
    limit: '10',
  })

  assert.deepEqual(result, {
    kbId: 'cmaaaaaaaaaaaaaaaaaaaaaaaa',
    cursor: 'cmbbbbbbbbbbbbbbbbbbbbbb',
    limit: 10,
  })
})

test('batchDeleteDocumentsSchema 要求非空数组', () => {
  assert.throws(
    () => batchDeleteDocumentsSchema.parse({ ids: [] }),
    /ids 必须是非空数组/
  )
})

test('changePasswordSchema 拒绝短新密码', () => {
  assert.throws(
    () => changePasswordSchema.parse({ oldPassword: '12345678', newPassword: '123' }),
    /新密码至少 8 位/
  )
})

test('updateUserSchema 拒绝空 payload，并对字符串做 trim', () => {
  assert.throws(() => updateUserSchema.parse({}), /无可更新字段/)

  const result = updateUserSchema.parse({
    name: '  Alice  ',
    zhipuApiKey: '  sk-demo  ',
    ragConfig: { topK: '8', temperature: '0.3' },
  })

  assert.deepEqual(result, {
    name: 'Alice',
    zhipuApiKey: 'sk-demo',
    ragConfig: { topK: 8, temperature: 0.3 },
  })
})

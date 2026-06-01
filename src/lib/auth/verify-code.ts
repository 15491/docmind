import { randomInt } from "crypto"

export type VerifyPurpose = "register" | "reset-password" | "change-email"

const TTL = 300
const COOLDOWN = 60
const MAX_ATTEMPTS = 5

interface CodeRecord {
  code: string
  attempts: number
  sentAt: number
}

export interface SendVerifyCodeDeps {
  getRecord: (key: string) => Promise<string | null>
  getRecordTtl: (key: string) => Promise<number>
  setRecord: (key: string, ttlSeconds: number, value: string) => Promise<unknown>
  deleteRecord: (key: string) => Promise<unknown>
  sendEmail: (payload: { to: string; subject: string; html: string }) => Promise<unknown>
}

function key(purpose: VerifyPurpose, email: string) {
  return `verify:${purpose}:${email}`
}

export async function sendVerifyCodeWithDeps(
  purpose: VerifyPurpose,
  email: string,
  deps: SendVerifyCodeDeps
) {
  const k = key(purpose, email)
  console.log('[verify-code] sendVerifyCode key:', k)
  const previousRaw = await deps.getRecord(k)
  const previousTtl = previousRaw ? await deps.getRecordTtl(k) : 0

  if (previousRaw) {
    const record = JSON.parse(previousRaw) as CodeRecord
    const elapsed = Math.floor(Date.now() / 1000) - record.sentAt
    if (elapsed < COOLDOWN) {
      throw Object.assign(new Error("发送过于频繁，请稍后再试"), { code: "COOLDOWN" })
    }
  }

  const code = String(randomInt(100000, 1000000))
  const record: CodeRecord = { code, attempts: 0, sentAt: Math.floor(Date.now() / 1000) }
  const nextRaw = JSON.stringify(record)
  const setResult = await deps.setRecord(k, TTL, nextRaw)
  console.log('[verify-code] setRecord result:', setResult, 'key:', k)

  try {
    await deps.sendEmail({
      to: email,
      subject: SUBJECTS[purpose],
      html: renderEmail(code, purpose),
    })
  } catch (error) {
    if (previousRaw && previousTtl > 0) {
      await deps.setRecord(k, previousTtl, previousRaw).catch(() => {})
    } else {
      await deps.deleteRecord(k).catch(() => {})
    }

    throw error
  }
}

export async function sendVerifyCode(purpose: VerifyPurpose, email: string) {
  const [{ redis }, { sendEmail }] = await Promise.all([
    import('@/lib/infra/redis'),
    import('@/lib/mailer'),
  ])

  return sendVerifyCodeWithDeps(purpose, email, {
    getRecord: (key) => redis.get(key),
    getRecordTtl: (key) => redis.ttl(key),
    setRecord: (key, ttlSeconds, value) => redis.setex(key, ttlSeconds, value),
    deleteRecord: (key) => redis.del(key),
    sendEmail,
  })
}

export async function verifyCode(
  purpose: VerifyPurpose,
  email: string,
  input: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { redis } = await import('@/lib/infra/redis')
  const k = key(purpose, email)
  const raw = await redis.get(k)
  console.log('[verify-code] get key:', k, '→', raw ? 'found' : 'null')

  if (!raw) return { ok: false, error: "验证码不存在或已过期" }

  const record = JSON.parse(raw) as CodeRecord

  if (record.attempts >= MAX_ATTEMPTS) {
    await redis.del(k)
    return { ok: false, error: "尝试次数过多，请重新获取验证码" }
  }

  if (record.code !== input) {
    record.attempts++
    const ttl = await redis.ttl(k)
    if (ttl > 0) await redis.setex(k, ttl, JSON.stringify(record))
    return { ok: false, error: "验证码不正确" }
  }

  await redis.del(k)
  return { ok: true }
}

const SUBJECTS: Record<VerifyPurpose, string> = {
  "register": "DocMind 注册验证码",
  "reset-password": "DocMind 重置密码验证码",
  "change-email": "DocMind 修改邮箱验证码",
}

const TITLES: Record<VerifyPurpose, string> = {
  "register": "欢迎注册 DocMind",
  "reset-password": "重置你的密码",
  "change-email": "修改你的邮箱",
}

const DESCS: Record<VerifyPurpose, string> = {
  "register": "请使用以下验证码完成注册，验证码 5 分钟内有效。",
  "reset-password": "请使用以下验证码重置密码，验证码 5 分钟内有效。",
  "change-email": "请使用以下验证码完成邮箱修改，验证码 5 分钟内有效。",
}

function renderEmail(code: string, purpose: VerifyPurpose) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0f0f10">
      <h2 style="font-size:18px;font-weight:700;margin:0 0 8px">${TITLES[purpose]}</h2>
      <p style="font-size:14px;color:#55555e;margin:0 0 24px">${DESCS[purpose]}</p>
      <div style="background:#f7f7f8;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px">
        <span style="font-size:36px;font-weight:700;letter-spacing:10px">${code}</span>
      </div>
      <p style="font-size:12px;color:#aaabb2;margin:0">如非本人操作，请忽略此邮件。</p>
    </div>
  `
}

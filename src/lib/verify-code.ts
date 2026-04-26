import { redis } from "./redis"
import { sendEmail } from "./mailer"

export type VerifyPurpose = "register" | "reset-password"

const TTL = 300      // 验证码有效期 5 分钟
const COOLDOWN = 60  // 重发冷却 60 秒
const MAX_ATTEMPTS = 5

interface CodeRecord {
  code: string
  attempts: number
  sentAt: number
}

function key(purpose: VerifyPurpose, email: string) {
  return `verify:${purpose}:${email}`
}

export async function sendVerifyCode(purpose: VerifyPurpose, email: string) {
  const k = key(purpose, email)
  const raw = await redis.get(k)

  if (raw) {
    const record = JSON.parse(raw) as CodeRecord
    const elapsed = Math.floor(Date.now() / 1000) - record.sentAt
    if (elapsed < COOLDOWN) {
      throw Object.assign(new Error("发送太频繁，请稍后再试"), { code: "COOLDOWN" })
    }
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const record: CodeRecord = { code, attempts: 0, sentAt: Math.floor(Date.now() / 1000) }
  await redis.setex(k, TTL, JSON.stringify(record))

  await sendEmail({
    to: email,
    subject: SUBJECTS[purpose],
    html: renderEmail(code, purpose),
  })
}

export async function verifyCode(
  purpose: VerifyPurpose,
  email: string,
  input: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const k = key(purpose, email)
  const raw = await redis.get(k)

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
}

const TITLES: Record<VerifyPurpose, string> = {
  "register": "欢迎注册 DocMind",
  "reset-password": "重置你的密码",
}

const DESCS: Record<VerifyPurpose, string> = {
  "register": "请使用以下验证码完成注册，验证码 5 分钟内有效。",
  "reset-password": "请使用以下验证码重置密码，验证码 5 分钟内有效。",
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

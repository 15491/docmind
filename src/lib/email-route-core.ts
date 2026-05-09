import { Err, R } from './response'

type VerifyCodeResult = { ok: true } | { ok: false; error: string }

export interface ChangeEmailDeps {
  verifyChangeEmailCode: (email: string, code: string) => Promise<VerifyCodeResult>
  findUserByEmail: (email: string) => Promise<{ id: string } | null>
  updateEmailByUserId: (userId: string, email: string) => Promise<unknown>
  revokeAllSessions: (userId: string) => Promise<unknown>
}

export async function changeEmailWithDeps(
  userId: string,
  input: { email: string; code: string },
  deps: ChangeEmailDeps
): Promise<Response> {
  const result = await deps.verifyChangeEmailCode(input.email, input.code)
  if (!result.ok) return Err.invalid(result.error)

  const existing = await deps.findUserByEmail(input.email)
  if (existing && existing.id !== userId) return Err.conflict('该邮箱已被其他账号使用')

  await deps.updateEmailByUserId(userId, input.email)
  await deps.revokeAllSessions(userId)

  return R.noData()
}

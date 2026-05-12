import { THIRD_PARTY_PASSWORD_SETUP_MESSAGE } from './auth-messages'
import { Err, R } from '@/lib/http/response'

type VerifyCodeResult = { ok: true } | { ok: false; error: string }

export interface ResetPasswordDeps {
  verifyResetCode: (email: string, code: string) => Promise<VerifyCodeResult>
  findUserByEmail: (email: string) => Promise<{ id: string; passwordHash: string | null } | null>
  hashPassword: (password: string) => Promise<string>
  updatePasswordByEmail: (email: string, passwordHash: string) => Promise<unknown>
  revokeAllSessions: (userId: string) => Promise<unknown>
}

export interface ChangePasswordDeps {
  findUserById: (userId: string) => Promise<{ passwordHash: string | null } | null>
  comparePassword: (inputPassword: string, passwordHash: string) => Promise<boolean>
  hashPassword: (password: string) => Promise<string>
  updatePasswordByUserId: (userId: string, passwordHash: string) => Promise<unknown>
  revokeAllSessions: (userId: string) => Promise<unknown>
}

export async function resetPasswordWithDeps(
  input: { email: string; code: string; newPassword: string },
  deps: ResetPasswordDeps
): Promise<Response> {
  const result = await deps.verifyResetCode(input.email, input.code)
  if (!result.ok) return Err.invalid(result.error)

  const user = await deps.findUserByEmail(input.email)
  if (!user) return Err.notFound('账号不存在')
  if (!user.passwordHash) return Err.invalid(THIRD_PARTY_PASSWORD_SETUP_MESSAGE)

  const passwordHash = await deps.hashPassword(input.newPassword)
  await deps.updatePasswordByEmail(input.email, passwordHash)
  await deps.revokeAllSessions(user.id)

  return R.noData()
}

export async function changePasswordWithDeps(
  userId: string,
  input: { oldPassword?: string; newPassword: string },
  deps: ChangePasswordDeps
): Promise<Response> {
  const user = await deps.findUserById(userId)
  if (!user) return Err.notFound('用户不存在')

  if (user.passwordHash) {
    if (!input.oldPassword) return Err.invalid('请输入当前密码')

    const valid = await deps.comparePassword(input.oldPassword, user.passwordHash)
    if (!valid) return Err.invalid('当前密码不正确')
  }

  const passwordHash = await deps.hashPassword(input.newPassword)
  await deps.updatePasswordByUserId(userId, passwordHash)
  await deps.revokeAllSessions(userId)

  return R.noData()
}

import { encryptUserApiKey, isEncryptedApiKey } from './api-key-crypto'

export interface UserApiKeyMigrationCandidate {
  id: string
  zhipuApiKey: string | null
}

export interface UserApiKeyMigrationFailure {
  userId: string
  reason: string
}

export interface UserApiKeyMigrationSummary {
  scanned: number
  eligible: number
  migrated: number
  skipped: number
  failed: number
  failures: UserApiKeyMigrationFailure[]
}

export function needsUserApiKeyMigration(storedApiKey: string | null | undefined): storedApiKey is string {
  return typeof storedApiKey === 'string'
    && storedApiKey.length > 0
    && !isEncryptedApiKey(storedApiKey)
}

export function buildEncryptedApiKeyForMigration(storedApiKey: string | null | undefined): string | null {
  if (!needsUserApiKeyMigration(storedApiKey)) {
    return null
  }

  return encryptUserApiKey(storedApiKey)
}

export async function migrateLegacyUserApiKeysWithDeps(
  deps: {
    listUsers: (cursor: string | undefined, take: number) => Promise<UserApiKeyMigrationCandidate[]>
    updateUserApiKey: (userId: string, encryptedApiKey: string) => Promise<unknown>
  },
  options: {
    batchSize?: number
    dryRun?: boolean
  } = {}
): Promise<UserApiKeyMigrationSummary> {
  const batchSize = Math.max(1, options.batchSize ?? 100)
  const dryRun = options.dryRun ?? false

  const summary: UserApiKeyMigrationSummary = {
    scanned: 0,
    eligible: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    failures: [],
  }

  let cursor: string | undefined

  for (;;) {
    const users = await deps.listUsers(cursor, batchSize)
    if (users.length === 0) {
      break
    }

    for (const user of users) {
      summary.scanned += 1

      const encryptedApiKey = buildEncryptedApiKeyForMigration(user.zhipuApiKey)
      if (!encryptedApiKey) {
        summary.skipped += 1
        continue
      }

      summary.eligible += 1

      if (dryRun) {
        continue
      }

      try {
        await deps.updateUserApiKey(user.id, encryptedApiKey)
        summary.migrated += 1
      } catch (error) {
        summary.failed += 1
        summary.failures.push({
          userId: user.id,
          reason: error instanceof Error ? error.message : String(error),
        })
      }
    }

    cursor = users[users.length - 1]?.id
    if (users.length < batchSize) {
      break
    }
  }

  return summary
}

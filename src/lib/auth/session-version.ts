import { prisma } from '@/lib/infra/prisma'

export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } })
}

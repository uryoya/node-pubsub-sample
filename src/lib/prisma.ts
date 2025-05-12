import { PrismaClient } from '@prisma/client';

// PrismaClientのグローバルインスタンスを作成（開発時の重複インスタンス作成を防ぐ）
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

// 開発環境では既存のPrismaインスタンスを再利用、なければ新規作成
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// 開発環境のホットリロード時にのみグローバル変数に保存
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

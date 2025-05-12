import express from 'express';
import { prisma } from './lib/prisma';

const app = express();

app.use(express.json());

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// データベース接続テスト
app.get('/db-test', async (req, res) => {
  try {
    // データベース接続が正常かチェック
    await prisma.$queryRaw`SELECT 1`;
    // タスク総数を取得
    const taskCount = await prisma.task.count();

    res.json({
      status: 'Database connection successful',
      taskCount,
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({
      status: 'Database connection failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// 基本ルート
app.get('/', (req, res) => {
  res.json({ message: 'Hello, World! Task Management API' });
});

export default app;

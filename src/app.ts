import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { prisma } from './lib/prisma';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './api/middlewares/errorHandler';

// Expressアプリケーションの作成
const app = express();

// 基本ミドルウェアの設定
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: config.cors.origin }));
app.use(helmet()); // セキュリティヘッダー

// リクエストロギング（開発環境のみ）
if (config.server.isDevelopment) {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });
}

// APIルートの設定
// API設計に応じて後で実装
app.use('/api', (req, res) => {
  res.json({ message: 'API endpoint - To be implemented' });
});

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
    logger.error('Database connection error:', error);
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

// 404ハンドラー (存在しないルートへのリクエスト処理)
app.use(notFoundHandler);

// エラーハンドリングミドルウェア (最後に配置)
app.use(errorHandler);

export default app;

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { prisma } from './lib/prisma';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './api/middlewares/errorHandler';
import apiRoutes from './api/routes';
import { testPubSubConnection } from './pubsub/client';

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

// APIルーターのマウント
app.use('/api', apiRoutes);

// Pub/Sub接続テストエンドポイント
app.get('/pubsub-test', async (req, res) => {
  try {
    const isConnected = await testPubSubConnection();

    if (isConnected) {
      res.json({
        status: 'success',
        message: 'Pub/Sub接続テスト成功',
        connectionDetails: {
          emulatorHost: config.pubsub.emulatorHost || 'なし（本番環境）',
          projectId: config.pubsub.projectId,
        },
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Pub/Sub接続テスト失敗',
        connectionDetails: {
          emulatorHost: config.pubsub.emulatorHost || 'なし（本番環境）',
          projectId: config.pubsub.projectId,
        },
      });
    }
  } catch (error) {
    logger.error('Pub/Sub接続テストエラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'Pub/Sub接続テスト中にエラーが発生しました',
      error: error instanceof Error ? error.message : String(error),
    });
  }
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

import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from './lib/prisma';
import { initializeTopics } from './pubsub/topics';
import { initializeAllSubscribers, stopAllSubscribers } from './pubsub/subscribers';

const PORT = config.server.port;

// サーバーの起動
const server = app.listen(PORT, async () => {
  logger.info(`サーバーが起動しました - ポート: ${PORT}`);
  logger.info(`環境: ${config.server.nodeEnv}`);
  logger.info(`アプリケーションURL: http://localhost:${PORT}`);

  try {
    // Pub/Subトピックの初期化
    await initializeTopics();
    logger.info('Pub/Subトピックの初期化が完了しました');

    // サブスクライバーの初期化
    await initializeAllSubscribers();
    logger.info('Pub/Subサブスクライバーの初期化が完了しました');
  } catch (error) {
    logger.error('Pub/Subの初期化中にエラーが発生しました:', error);
    // 重大なエラーの場合はアプリケーションを終了
    // process.exit(1);
  }
});

// グレースフルシャットダウン
const shutdown = async () => {
  logger.info('シャットダウン処理を開始します...');

  // サブスクライバーの停止
  stopAllSubscribers();
  logger.info('Pub/Subサブスクライバーを停止しました');

  server.close(async () => {
    logger.info('Express サーバーを終了しました');

    try {
      await prisma.$disconnect();
      logger.info('データベース接続を終了しました');
      process.exit(0);
    } catch (error) {
      logger.error('データベース切断中にエラーが発生しました:', error);
      process.exit(1);
    }
  });
};

// シグナルハンドラー
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default server;

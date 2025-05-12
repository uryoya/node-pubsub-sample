import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from './lib/prisma';

const PORT = config.server.port;

// サーバーの起動
const server = app.listen(PORT, () => {
  logger.info(`サーバーが起動しました - ポート: ${PORT}`);
  logger.info(`環境: ${config.server.nodeEnv}`);
  logger.info(`アプリケーションURL: http://localhost:${PORT}`);
});

// グレースフルシャットダウン
const shutdown = async () => {
  logger.info('シャットダウン処理を開始します...');

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

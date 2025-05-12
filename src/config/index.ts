import dotenv from 'dotenv';
import path from 'path';

// .envファイルを読み込む（存在する場合）
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// 必須環境変数のリスト
const requiredEnvVars = ['DATABASE_URL', 'PORT', 'PUBSUB_EMULATOR_HOST', 'PUBSUB_PROJECT_ID'];

// 環境変数の存在確認（開発環境でのみチェック）
if (process.env.NODE_ENV === 'development' && !process.env.CI) {
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    // 警告のみ表示し、デフォルト値で続行
    console.warn(`警告: 以下の環境変数が設定されていません: ${missingEnvVars.join(', ')}`);
  }
}

// アプリケーション設定
export const config = {
  // サーバー設定
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV !== 'production',
    logLevel: process.env.LOG_LEVEL || 'info',
  },

  // データベース設定
  database: {
    url: process.env.DATABASE_URL || 'mysql://user:password@localhost:3306/taskdb',
  },

  // Pub/Sub設定
  pubsub: {
    emulatorHost: process.env.PUBSUB_EMULATOR_HOST || 'localhost:8085',
    projectId: process.env.PUBSUB_PROJECT_ID || 'task-project',
  },

  // コルス設定
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};

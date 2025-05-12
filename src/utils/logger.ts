import winston from 'winston';
import { config } from '../config';

// ログフォーマットの定義
const logFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  return `${timestamp} [${level}]: ${message} ${
    Object.keys(metadata).length ? JSON.stringify(metadata) : ''
  }`;
});

// ロガーの設定
export const logger = winston.createLogger({
  level: config.server.isDevelopment ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'task-service' },
  transports: [
    // コンソール出力
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat,
      ),
    }),
    // 開発環境以外ではファイル出力も追加可能
    // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Stream for Morgan (HTTP request logging)
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

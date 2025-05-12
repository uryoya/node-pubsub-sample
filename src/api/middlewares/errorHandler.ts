import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

// APIエラーの基本クラス
export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 404 Not Found エラー
export class NotFoundError extends ApiError {
  constructor(message = 'リソースが見つかりません') {
    super(404, message);
  }
}

// 400 Bad Request エラー
export class BadRequestError extends ApiError {
  constructor(message = '無効なリクエストです') {
    super(400, message);
  }
}

// 500 Internal Server Error
export class InternalServerError extends ApiError {
  constructor(message = 'サーバー内部エラーが発生しました') {
    super(500, message);
  }
}

// エラーハンドリングミドルウェア
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // APIエラーの場合
  if (err instanceof ApiError) {
    const { statusCode, message } = err;

    logger.error(`API Error: ${message}`, {
      statusCode,
      path: req.path,
      method: req.method,
      ...(err.stack && { stack: err.stack }),
    });

    return res.status(statusCode).json({
      status: 'error',
      statusCode,
      message,
    });
  }

  // 予期せぬエラーの場合
  logger.error('Unexpected Error', {
    error: err.message,
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  return res.status(500).json({
    status: 'error',
    statusCode: 500,
    message: 'サーバー内部エラーが発生しました',
  });
};

// 404ハンドラー (ルートが見つからない場合)
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`パス '${req.originalUrl}' が見つかりません`));
};

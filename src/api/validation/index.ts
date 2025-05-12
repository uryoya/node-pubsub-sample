import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { BadRequestError } from '../middlewares/errorHandler';

export * from './taskValidation';

/**
 * バリデーションエラーをチェックして処理するミドルウェア
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => {
      return {
        field: error.type === 'field' ? error.path : undefined,
        message: error.msg,
      };
    });

    throw new BadRequestError('バリデーションエラー');
  }

  next();
};

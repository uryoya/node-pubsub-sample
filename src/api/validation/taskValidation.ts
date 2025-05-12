import { body, param, query, ValidationChain } from 'express-validator';
import { TaskPriority, TaskStatus } from '../../types';

/**
 * タスク作成リクエストのバリデーション
 */
export const validateCreateTask: ValidationChain[] = [
  body('title')
    .notEmpty()
    .withMessage('タスクのタイトルは必須です')
    .isString()
    .withMessage('タイトルは文字列である必要があります')
    .isLength({ min: 1, max: 100 })
    .withMessage('タイトルは1〜100文字である必要があります'),

  body('description')
    .optional()
    .isString()
    .withMessage('説明は文字列である必要があります')
    .isLength({ max: 500 })
    .withMessage('説明は500文字以内である必要があります'),

  body('priority')
    .optional()
    .isIn(Object.values(TaskPriority))
    .withMessage(
      `優先度は ${Object.values(TaskPriority).join(', ')} のいずれかである必要があります`,
    ),

  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('期限日はISO8601形式の日付である必要があります'),
];

/**
 * タスク更新リクエストのバリデーション
 */
export const validateUpdateTask: ValidationChain[] = [
  param('id').isUUID().withMessage('タスクIDは有効なUUID形式である必要があります'),

  body('title')
    .optional()
    .isString()
    .withMessage('タイトルは文字列である必要があります')
    .isLength({ min: 1, max: 100 })
    .withMessage('タイトルは1〜100文字である必要があります'),

  body('description')
    .optional()
    .isString()
    .withMessage('説明は文字列である必要があります')
    .isLength({ max: 500 })
    .withMessage('説明は500文字以内である必要があります'),

  body('priority')
    .optional()
    .isIn(Object.values(TaskPriority))
    .withMessage(
      `優先度は ${Object.values(TaskPriority).join(', ')} のいずれかである必要があります`,
    ),

  body('dueDate')
    .optional({ nullable: true })
    .custom(value => {
      if (value === null) return true;
      if (!value) return true;

      // ISO8601形式の日付文字列かチェック
      const isValidDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value);
      if (!isValidDate) {
        throw new Error('期限日はISO8601形式の日付である必要があります');
      }
      return true;
    }),
];

/**
 * タスクステータス更新リクエストのバリデーション
 */
export const validateUpdateTaskStatus: ValidationChain[] = [
  param('id').isUUID().withMessage('タスクIDは有効なUUID形式である必要があります'),

  body('status')
    .notEmpty()
    .withMessage('ステータスは必須です')
    .isIn(Object.values(TaskStatus))
    .withMessage(
      `ステータスは ${Object.values(TaskStatus).join(', ')} のいずれかである必要があります`,
    ),
];

/**
 * タスクID（パスパラメータ）のバリデーション
 */
export const validateTaskId: ValidationChain[] = [
  param('id').isUUID().withMessage('タスクIDは有効なUUID形式である必要があります'),
];

/**
 * タスク一覧取得リクエストのバリデーション
 */
export const validateGetTasks: ValidationChain[] = [
  query('status')
    .optional()
    .isIn(Object.values(TaskStatus))
    .withMessage(
      `ステータスは ${Object.values(TaskStatus).join(', ')} のいずれかである必要があります`,
    ),

  query('priority')
    .optional()
    .isIn(Object.values(TaskPriority))
    .withMessage(
      `優先度は ${Object.values(TaskPriority).join(', ')} のいずれかである必要があります`,
    ),

  query('search').optional().isString().withMessage('検索キーワードは文字列である必要があります'),

  query('sortBy')
    .optional()
    .isIn(['title', 'dueDate', 'createdAt', 'priority', 'status'])
    .withMessage(
      'ソートフィールドは title, dueDate, createdAt, priority, status のいずれかである必要があります',
    ),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('ソート順は asc または desc である必要があります'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ページ番号は1以上の整数である必要があります')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('1ページあたりの件数は1〜100の整数である必要があります')
    .toInt(),
];

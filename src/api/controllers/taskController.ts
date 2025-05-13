import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';
import {
  CreateTaskRequest,
  UpdateTaskRequest,
  UpdateTaskStatusRequest,
  TaskFilterOptions,
  TaskSortOptions,
  TaskPaginationOptions,
  TaskStatus,
  TaskPriority,
} from '../../types';
import { ApiError, BadRequestError, NotFoundError } from '../middlewares/errorHandler';
import {
  publishTaskCreated,
  publishTaskUpdated,
  publishTaskDeleted,
  publishTaskStatusChanged,
} from '../../pubsub/publishers';

/**
 * タスク作成コントローラー
 */
export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, priority, dueDate } = req.body as CreateTaskRequest;

    // Prismaを使ってタスクを作成
    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        priority: priority || TaskPriority.MEDIUM,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    logger.info(`タスクを作成しました - ID: ${task.id}`);

    // イベント発行: タスク作成
    try {
      await publishTaskCreated(task);
      logger.info(`タスク作成イベントを発行しました - ID: ${task.id}`);
    } catch (pubsubError) {
      logger.error(`タスク作成イベント発行に失敗しました - ID: ${task.id}`, pubsubError);
      // イベント発行の失敗はユーザーには伝えない（非同期処理として扱う）
    }

    // 成功レスポンス
    res.status(201).json({
      status: 'success',
      data: {
        task: {
          ...task,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
          dueDate: task.dueDate?.toISOString() || null,
        },
      },
      message: 'タスクが正常に作成されました',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * タスク一覧取得コントローラー
 */
export const getTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // クエリパラメータの取得
    const {
      status,
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = req.query as unknown as TaskFilterOptions & TaskSortOptions & TaskPaginationOptions;

    // フィルタ条件の構築
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (search) {
      where.OR = [{ title: { contains: search } }, { description: { contains: search } }];
    }

    // ソート条件の構築
    const orderBy: any = {};
    orderBy[sortBy || 'createdAt'] = sortOrder || 'desc';

    // ページネーション
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // タスク総数の取得
    const total = await prisma.task.count({ where });

    // タスク一覧の取得
    const tasks = await prisma.task.findMany({
      where,
      orderBy,
      skip,
      take,
    });

    // ページ情報
    const totalPages = Math.ceil(total / take);

    // 成功レスポンス
    res.json({
      status: 'success',
      data: {
        tasks: tasks.map(task => ({
          ...task,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
          dueDate: task.dueDate?.toISOString() || null,
        })),
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * タスク詳細取得コントローラー
 */
export const getTaskById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // タスクの取得
    const task = await prisma.task.findUnique({
      where: { id },
    });

    // タスクが存在しない場合
    if (!task) {
      throw new NotFoundError(`ID: ${id} のタスクが見つかりません`);
    }

    // 成功レスポンス
    res.json({
      status: 'success',
      data: {
        task: {
          ...task,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
          dueDate: task.dueDate?.toISOString() || null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * タスク更新コントローラー
 */
export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, description, priority, dueDate } = req.body as UpdateTaskRequest;

    // 更新するタスクが存在するか確認
    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      throw new NotFoundError(`ID: ${id} のタスクが見つかりません`);
    }

    // 更新データの準備
    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    // タスクの更新
    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    logger.info(`タスクを更新しました - ID: ${id}`);

    // イベント発行: タスク更新
    try {
      await publishTaskUpdated(updatedTask, existingTask);
      logger.info(`タスク更新イベントを発行しました - ID: ${id}`);
    } catch (pubsubError) {
      logger.error(`タスク更新イベント発行に失敗しました - ID: ${id}`, pubsubError);
      // イベント発行の失敗はユーザーには伝えない
    }

    // 成功レスポンス
    res.json({
      status: 'success',
      data: {
        task: {
          ...updatedTask,
          createdAt: updatedTask.createdAt.toISOString(),
          updatedAt: updatedTask.updatedAt.toISOString(),
          dueDate: updatedTask.dueDate?.toISOString() || null,
        },
      },
      message: 'タスクが正常に更新されました',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * タスクステータス更新コントローラー
 */
export const updateTaskStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body as UpdateTaskStatusRequest;

    // 更新するタスクが存在するか確認
    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      throw new NotFoundError(`ID: ${id} のタスクが見つかりません`);
    }

    // 前のステータス値を記録
    const previousStatus = existingTask.status;

    // ステータス遷移の検証（必要に応じて）
    // ここではシンプルにするため省略

    // タスクステータスの更新
    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status },
    });

    logger.info(`タスクステータスを更新しました - ID: ${id}, ステータス: ${status}`);

    // イベント発行: タスクステータス変更
    try {
      await publishTaskStatusChanged(updatedTask, previousStatus);
      logger.info(
        `タスクステータス変更イベントを発行しました - ID: ${id}, ${previousStatus} -> ${status}`,
      );
    } catch (pubsubError) {
      logger.error(`タスクステータス変更イベント発行に失敗しました - ID: ${id}`, pubsubError);
      // イベント発行の失敗はユーザーには伝えない
    }

    // 成功レスポンス
    res.json({
      status: 'success',
      data: {
        task: {
          ...updatedTask,
          createdAt: updatedTask.createdAt.toISOString(),
          updatedAt: updatedTask.updatedAt.toISOString(),
          dueDate: updatedTask.dueDate?.toISOString() || null,
        },
      },
      message: 'タスクステータスが正常に更新されました',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * タスク削除コントローラー
 */
export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // 削除するタスクが存在するか確認
    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      throw new NotFoundError(`ID: ${id} のタスクが見つかりません`);
    }

    // タスク情報のコピーを保持（削除後にイベント発行で使用）
    const taskToDelete = { ...existingTask };

    // タスクの削除
    await prisma.task.delete({
      where: { id },
    });

    logger.info(`タスクを削除しました - ID: ${id}`);

    // イベント発行: タスク削除
    try {
      await publishTaskDeleted(taskToDelete);
      logger.info(`タスク削除イベントを発行しました - ID: ${id}`);
    } catch (pubsubError) {
      logger.error(`タスク削除イベント発行に失敗しました - ID: ${id}`, pubsubError);
      // イベント発行の失敗はユーザーには伝えない
    }

    // 成功レスポンス
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

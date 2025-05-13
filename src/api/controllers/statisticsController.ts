import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';
import { TaskStatisticsResponse } from '../../types';

/**
 * タスク統計情報取得コントローラー
 */
export const getTaskStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // シングルトンの統計情報レコードを取得
    const stats = await prisma.taskStatistics.findUnique({
      where: { id: 'singleton' },
    });

    if (!stats) {
      return res.status(404).json({
        status: 'error',
        message: '統計情報が見つかりません',
      });
    }

    // APIレスポンス用に整形
    const response: TaskStatisticsResponse = {
      totalTasks: stats.totalTasks,
      byStatus: {
        todo: stats.todoTasks,
        inProgress: stats.inProgressTasks,
        done: stats.doneTasks,
      },
      byPriority: {
        low: stats.lowPriority,
        medium: stats.mediumPriority,
        high: stats.highPriority,
      },
      today: {
        created: stats.createdToday,
        completed: stats.completedToday,
      },
      lastUpdated: stats.lastUpdated.toISOString(),
    };

    // 成功レスポンス
    res.json(response);
  } catch (error) {
    logger.error('統計情報取得中にエラーが発生しました:', error);
    next(error);
  }
};

/**
 * タスク統計情報をリセットするコントローラー
 * PoCのテスト用 - 本番環境では使用しない
 */
export const resetTaskStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 現在のタスク数を取得
    const taskCount = await prisma.task.count();
    const todoCount = await prisma.task.count({ where: { status: 'TODO' } });
    const inProgressCount = await prisma.task.count({ where: { status: 'IN_PROGRESS' } });
    const doneCount = await prisma.task.count({ where: { status: 'DONE' } });
    const lowCount = await prisma.task.count({ where: { priority: 'LOW' } });
    const mediumCount = await prisma.task.count({ where: { priority: 'MEDIUM' } });
    const highCount = await prisma.task.count({ where: { priority: 'HIGH' } });

    // 統計情報を更新
    const stats = await prisma.taskStatistics.update({
      where: { id: 'singleton' },
      data: {
        totalTasks: taskCount,
        todoTasks: todoCount,
        inProgressTasks: inProgressCount,
        doneTasks: doneCount,
        lowPriority: lowCount,
        mediumPriority: mediumCount,
        highPriority: highCount,
        createdToday: 0, // 今日のカウンターはリセット
        completedToday: 0, // 今日のカウンターはリセット
        lastUpdated: new Date(),
      },
    });

    logger.info('統計情報をリセットしました', stats);

    // 成功レスポンス
    res.json({
      status: 'success',
      message: '統計情報をリセットしました',
      data: {
        totalTasks: stats.totalTasks,
        todoTasks: stats.todoTasks,
        inProgressTasks: stats.inProgressTasks,
        doneTasks: stats.doneTasks,
      },
    });
  } catch (error) {
    logger.error('統計情報リセット中にエラーが発生しました:', error);
    next(error);
  }
};

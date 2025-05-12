import { TaskStatistics as PrismaTaskStatistics } from '@prisma/client';

/**
 * タスク統計情報の基本型（Prismaモデルと同等）
 */
export type TaskStatistics = PrismaTaskStatistics;

/**
 * タスク統計情報レスポンス（クライアントに返す型）
 */
export interface TaskStatisticsResponse {
  totalTasks: number;
  byStatus: {
    todo: number;
    inProgress: number;
    done: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
  };
  today: {
    created: number;
    completed: number;
  };
  lastUpdated: string; // ISO形式の日付文字列
}

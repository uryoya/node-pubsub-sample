import { Task as PrismaTask } from '@prisma/client';

/**
 * タスクのステータス
 */
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

/**
 * タスクの優先度
 */
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

/**
 * タスクの基本型（Prismaモデルと同等）
 */
export type Task = PrismaTask;

/**
 * タスク作成リクエスト
 */
export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string; // ISO形式の日付文字列
}

/**
 * タスク更新リクエスト
 */
export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null; // ISO形式の日付文字列、nullの場合は日付を削除
}

/**
 * タスクステータス変更リクエスト
 */
export interface UpdateTaskStatusRequest {
  status: TaskStatus;
}

/**
 * タスクレスポンス（クライアントに返す型）
 */
export interface TaskResponse {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null; // ISO形式の日付文字列
  createdAt: string; // ISO形式の日付文字列
  updatedAt: string; // ISO形式の日付文字列
}

/**
 * タスク一覧のフィルター条件
 */
export interface TaskFilterOptions {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string; // タイトルまたは説明での検索
  dueDate?: string; // ISO形式の日付文字列
}

/**
 * タスク一覧のソートオプション
 */
export interface TaskSortOptions {
  sortBy?: 'title' | 'dueDate' | 'createdAt' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * タスク一覧のページネーションオプション
 */
export interface TaskPaginationOptions {
  page?: number;
  limit?: number;
}

/**
 * タスク一覧レスポンス
 */
export interface TaskListResponse {
  tasks: TaskResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

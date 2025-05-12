import { Task } from './task';

/**
 * タスクイベントタイプの列挙型
 */
export enum TaskEventType {
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_DELETED = 'TASK_DELETED',
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
}

/**
 * タスクイベントの基本インターフェース
 */
export interface TaskEvent {
  eventType: TaskEventType;
  taskId: string;
  task: Task;
  timestamp: string; // ISO形式の日時文字列
  metadata?: Record<string, any>;
}

/**
 * タスク作成イベント
 */
export interface TaskCreatedEvent extends TaskEvent {
  eventType: TaskEventType.TASK_CREATED;
}

/**
 * タスク更新イベント
 */
export interface TaskUpdatedEvent extends TaskEvent {
  eventType: TaskEventType.TASK_UPDATED;
  previousTask?: Partial<Task>;
}

/**
 * タスク削除イベント
 */
export interface TaskDeletedEvent extends TaskEvent {
  eventType: TaskEventType.TASK_DELETED;
}

/**
 * タスクステータス変更イベント
 */
export interface TaskStatusChangedEvent extends TaskEvent {
  eventType: TaskEventType.TASK_STATUS_CHANGED;
  previousStatus: string;
}

/**
 * Pub/Subトピック名の列挙型
 */
export enum PubSubTopic {
  TASK_CREATED = 'task-created',
  TASK_UPDATED = 'task-updated',
  TASK_DELETED = 'task-deleted',
  TASK_STATUS_CHANGED = 'task-status-changed',
}

/**
 * サブスクリプション名の列挙型
 */
export enum PubSubSubscription {
  TASK_NOTIFICATION = 'task-notification',
  TASK_STATISTICS = 'task-statistics',
}

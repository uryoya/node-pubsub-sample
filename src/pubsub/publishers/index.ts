import { Buffer } from 'buffer';
import { Topic } from '@google-cloud/pubsub';
import { Task } from '@prisma/client';
import { getTopic } from '../topics';
import { PubSubTopic, TaskEventType, TaskEvent } from '../../types';
import { logger } from '../../utils/logger';

/**
 * 基本イベント発行関数
 * @param topic 発行先トピック
 * @param eventData イベントデータ
 * @returns 発行されたメッセージID
 */
async function publishEvent<T extends TaskEvent>(topic: Topic, eventData: T): Promise<string> {
  try {
    // イベントデータをJSON文字列化してBufferに変換
    const dataBuffer = Buffer.from(JSON.stringify(eventData));

    // Pub/Subにメッセージを発行
    const messageId = await topic.publish(dataBuffer);

    logger.info(`イベント発行成功: ${eventData.eventType}, MessageID: ${messageId}`);
    return messageId;
  } catch (error) {
    logger.error(`イベント発行エラー: ${eventData.eventType}`, error);
    throw error;
  }
}

/**
 * タスク作成イベントを発行
 * @param task 作成されたタスク
 */
export async function publishTaskCreated(task: Task): Promise<string> {
  const topic = getTopic(PubSubTopic.TASK_CREATED);

  const eventData: TaskEvent = {
    eventType: TaskEventType.TASK_CREATED,
    taskId: task.id,
    task: task,
    timestamp: new Date().toISOString(),
  };

  return publishEvent(topic, eventData);
}

/**
 * タスク更新イベントを発行
 * @param task 更新されたタスク
 * @param previousTask 更新前のタスク情報（部分的）
 */
export async function publishTaskUpdated(
  task: Task,
  previousTask?: Partial<Task>,
): Promise<string> {
  const topic = getTopic(PubSubTopic.TASK_UPDATED);

  const eventData: TaskEvent = {
    eventType: TaskEventType.TASK_UPDATED,
    taskId: task.id,
    task: task,
    timestamp: new Date().toISOString(),
    metadata: previousTask ? { previousTask } : undefined,
  };

  return publishEvent(topic, eventData);
}

/**
 * タスク削除イベントを発行
 * @param task 削除されたタスク
 */
export async function publishTaskDeleted(task: Task): Promise<string> {
  const topic = getTopic(PubSubTopic.TASK_DELETED);

  const eventData: TaskEvent = {
    eventType: TaskEventType.TASK_DELETED,
    taskId: task.id,
    task: task,
    timestamp: new Date().toISOString(),
  };

  return publishEvent(topic, eventData);
}

/**
 * タスクステータス変更イベントを発行
 * @param task 更新されたタスク
 * @param previousStatus 変更前のステータス
 */
export async function publishTaskStatusChanged(
  task: Task,
  previousStatus: string,
): Promise<string> {
  const topic = getTopic(PubSubTopic.TASK_STATUS_CHANGED);

  const eventData: TaskEvent = {
    eventType: TaskEventType.TASK_STATUS_CHANGED,
    taskId: task.id,
    task: task,
    timestamp: new Date().toISOString(),
    metadata: { previousStatus },
  };

  return publishEvent(topic, eventData);
}

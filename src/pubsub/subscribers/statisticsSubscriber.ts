import { Subscription } from '@google-cloud/pubsub';
import { getPubSubClient, subscriptionExists } from '../client';
import { logger } from '../../utils/logger';
import { PubSubSubscription, PubSubTopic, TaskEvent, TaskEventType } from '../../types';
import { prisma } from '../../lib/prisma';
import { TaskStatus, TaskPriority } from '@prisma/client';

/**
 * 統計情報サブスクリプションのキャッシュ
 */
let statisticsSubscription: Subscription | null = null;

/**
 * 統計情報用サブスクリプションを作成または取得する
 * @param topicName トピック名
 * @param subscriptionName サブスクリプション名
 */
async function getOrCreateSubscription(
  topicName: PubSubTopic,
  subscriptionName: string,
): Promise<Subscription> {
  const pubsub = getPubSubClient();

  // サブスクリプションが存在するか確認
  const exists = await subscriptionExists(subscriptionName);

  if (!exists) {
    try {
      logger.info(`サブスクリプション ${subscriptionName} が存在しないため作成します`);
      // トピックとサブスクリプションの参照を取得
      const topic = pubsub.topic(topicName);
      const [subscription] = await topic.createSubscription(subscriptionName, {
        messageRetentionDuration: { seconds: 60 * 60 }, // 60分間保持
        ackDeadlineSeconds: 30, // 30秒のACK期限
      });

      logger.info(`サブスクリプション ${subscriptionName} を作成しました`);
      return subscription;
    } catch (error) {
      if (error instanceof Error && error.message.includes('ALREADY_EXISTS')) {
        logger.info(`サブスクリプション ${subscriptionName} はすでに作成されています`);
      } else {
        logger.error(`サブスクリプション ${subscriptionName} 作成中にエラー:`, error);
        throw error;
      }
    }
  } else {
    logger.info(`サブスクリプション ${subscriptionName} は既存のものを使用します`);
  }

  // 既存のサブスクリプションを取得
  return pubsub.subscription(subscriptionName);
}

/**
 * 統計情報の初期化
 * アプリケーション起動時に統計情報が存在しない場合に作成
 */
async function initializeStatistics(): Promise<void> {
  try {
    // 統計情報レコードの存在を確認
    const statsCount = await prisma.taskStatistics.count();

    if (statsCount === 0) {
      // 統計情報が存在しない場合は初期レコードを作成
      const initialStats = await prisma.taskStatistics.create({
        data: {
          id: 'singleton', // シングルトンレコード
          totalTasks: 0,
          todoTasks: 0,
          inProgressTasks: 0,
          doneTasks: 0,
          lowPriority: 0,
          mediumPriority: 0,
          highPriority: 0,
          createdToday: 0,
          completedToday: 0,
          lastUpdated: new Date(),
        },
      });

      logger.info('統計情報を初期化しました', initialStats);
    } else {
      logger.info('統計情報はすでに初期化されています');

      // 日付が変わっている場合は日次カウンターをリセット
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = await prisma.taskStatistics.findUnique({
        where: { id: 'singleton' },
      });

      if (stats && stats.lastUpdated.getDate() !== today.getDate()) {
        await prisma.taskStatistics.update({
          where: { id: 'singleton' },
          data: {
            createdToday: 0,
            completedToday: 0,
          },
        });
        logger.info('日次統計カウンターをリセットしました');
      }
    }
  } catch (error) {
    logger.error('統計情報の初期化中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * 統計情報の更新処理
 * タスクイベント受信時にサマリー情報を更新する
 */
async function updateTaskStatistics(eventData: TaskEvent): Promise<void> {
  try {
    switch (eventData.eventType) {
      case TaskEventType.TASK_CREATED:
        // タスク作成時の統計更新
        await updateStatisticsForTaskCreated(eventData);
        break;

      case TaskEventType.TASK_DELETED:
        // タスク削除時の統計更新
        await updateStatisticsForTaskDeleted(eventData);
        break;

      case TaskEventType.TASK_STATUS_CHANGED:
        // タスクステータス変更時の統計更新
        await updateStatisticsForStatusChanged(eventData);
        break;

      case TaskEventType.TASK_UPDATED:
        // タスク更新時は優先度変更があれば統計を更新
        if (eventData.metadata?.previousTask?.priority) {
          await updateStatisticsForPriorityChanged(
            eventData.task.priority as TaskPriority,
            eventData.metadata.previousTask.priority as TaskPriority,
          );
        }
        break;
    }
  } catch (error) {
    logger.error('統計情報の更新中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * タスク作成時の統計更新
 */
async function updateStatisticsForTaskCreated(eventData: TaskEvent): Promise<void> {
  const task = eventData.task;

  // 統計情報を更新
  await prisma.taskStatistics.update({
    where: { id: 'singleton' },
    data: {
      totalTasks: { increment: 1 },
      todoTasks: task.status === TaskStatus.TODO ? { increment: 1 } : undefined,
      inProgressTasks: task.status === TaskStatus.IN_PROGRESS ? { increment: 1 } : undefined,
      doneTasks: task.status === TaskStatus.DONE ? { increment: 1 } : undefined,
      lowPriority: task.priority === TaskPriority.LOW ? { increment: 1 } : undefined,
      mediumPriority: task.priority === TaskPriority.MEDIUM ? { increment: 1 } : undefined,
      highPriority: task.priority === TaskPriority.HIGH ? { increment: 1 } : undefined,
      createdToday: { increment: 1 },
      lastUpdated: new Date(),
    },
  });

  logger.info(`統計情報を更新しました: タスク作成 ID=${task.id}`);
}

/**
 * タスク削除時の統計更新
 */
async function updateStatisticsForTaskDeleted(eventData: TaskEvent): Promise<void> {
  const task = eventData.task;

  // 統計情報を更新
  await prisma.taskStatistics.update({
    where: { id: 'singleton' },
    data: {
      totalTasks: { decrement: 1 },
      todoTasks: task.status === TaskStatus.TODO ? { decrement: 1 } : undefined,
      inProgressTasks: task.status === TaskStatus.IN_PROGRESS ? { decrement: 1 } : undefined,
      doneTasks: task.status === TaskStatus.DONE ? { decrement: 1 } : undefined,
      lowPriority: task.priority === TaskPriority.LOW ? { decrement: 1 } : undefined,
      mediumPriority: task.priority === TaskPriority.MEDIUM ? { decrement: 1 } : undefined,
      highPriority: task.priority === TaskPriority.HIGH ? { decrement: 1 } : undefined,
      lastUpdated: new Date(),
    },
  });

  logger.info(`統計情報を更新しました: タスク削除 ID=${task.id}`);
}

/**
 * タスクステータス変更時の統計更新
 */
async function updateStatisticsForStatusChanged(eventData: TaskEvent): Promise<void> {
  const task = eventData.task;
  const previousStatus = eventData.metadata?.previousStatus as string;

  // 前のステータスに応じてカウントを減らし、新しいステータスのカウントを増やす
  const updateData: any = {
    lastUpdated: new Date(),
  };

  // 前のステータスのカウントを減らす
  if (previousStatus === TaskStatus.TODO) {
    updateData.todoTasks = { decrement: 1 };
  } else if (previousStatus === TaskStatus.IN_PROGRESS) {
    updateData.inProgressTasks = { decrement: 1 };
  } else if (previousStatus === TaskStatus.DONE) {
    updateData.doneTasks = { decrement: 1 };
  }

  // 新しいステータスのカウントを増やす
  if (task.status === TaskStatus.TODO) {
    updateData.todoTasks = { increment: 1 };
  } else if (task.status === TaskStatus.IN_PROGRESS) {
    updateData.inProgressTasks = { increment: 1 };
  } else if (task.status === TaskStatus.DONE) {
    updateData.doneTasks = { increment: 1 };
    // 完了したタスクの場合は、今日完了したタスク数も増やす
    updateData.completedToday = { increment: 1 };
  }

  // 統計情報を更新
  await prisma.taskStatistics.update({
    where: { id: 'singleton' },
    data: updateData,
  });

  logger.info(
    `統計情報を更新しました: ステータス変更 ID=${task.id}, ${previousStatus} -> ${task.status}`,
  );
}

/**
 * タスク優先度変更時の統計更新
 */
async function updateStatisticsForPriorityChanged(
  newPriority: TaskPriority,
  oldPriority: TaskPriority,
): Promise<void> {
  // 前の優先度のカウントを減らし、新しい優先度のカウントを増やす
  const updateData: any = {
    lastUpdated: new Date(),
  };

  // 前の優先度のカウントを減らす
  if (oldPriority === TaskPriority.LOW) {
    updateData.lowPriority = { decrement: 1 };
  } else if (oldPriority === TaskPriority.MEDIUM) {
    updateData.mediumPriority = { decrement: 1 };
  } else if (oldPriority === TaskPriority.HIGH) {
    updateData.highPriority = { decrement: 1 };
  }

  // 新しい優先度のカウントを増やす
  if (newPriority === TaskPriority.LOW) {
    updateData.lowPriority = { increment: 1 };
  } else if (newPriority === TaskPriority.MEDIUM) {
    updateData.mediumPriority = { increment: 1 };
  } else if (newPriority === TaskPriority.HIGH) {
    updateData.highPriority = { increment: 1 };
  }

  // 統計情報を更新
  await prisma.taskStatistics.update({
    where: { id: 'singleton' },
    data: updateData,
  });

  logger.info(`統計情報を更新しました: 優先度変更 ${oldPriority} -> ${newPriority}`);
}

/**
 * 統計情報サブスクライバーの初期化
 */
export async function initializeStatisticsSubscriber(): Promise<void> {
  if (statisticsSubscription) {
    logger.info('統計情報サブスクライバーはすでに初期化されています');
    return;
  }

  try {
    // 統計情報テーブルの初期化
    await initializeStatistics();

    // ステータス変更トピックに対するサブスクリプションを作成
    statisticsSubscription = await getOrCreateSubscription(
      PubSubTopic.TASK_STATUS_CHANGED,
      PubSubSubscription.TASK_STATISTICS,
    );

    // メッセージハンドラーを設定
    statisticsSubscription.on('message', handleStatisticsMessage);
    statisticsSubscription.on('error', handleSubscriptionError);

    logger.info('統計情報サブスクライバーの初期化が完了しました');
  } catch (error) {
    logger.error('統計情報サブスクライバーの初期化中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * 統計情報メッセージ処理ハンドラー
 */
function handleStatisticsMessage(message: any): void {
  try {
    // メッセージデータをパースしてイベントオブジェクトを取得
    const eventData: TaskEvent = JSON.parse(message.data.toString());

    // 統計情報を更新（非同期処理だが結果を待たずにメッセージを確認）
    updateTaskStatistics(eventData)
      .then(() => {
        // メッセージを確認済みとしてマーク
        message.ack();
      })
      .catch(error => {
        logger.error('統計情報更新処理中にエラーが発生しました:', error);
        // エラーが発生したメッセージは再処理のためnackする
        message.nack();
      });
  } catch (error) {
    logger.error('統計情報メッセージ処理中にエラーが発生しました:', error);
    // エラーが発生したメッセージは再処理のためnackする
    message.nack();
  }
}

/**
 * サブスクリプションエラーハンドラー
 */
function handleSubscriptionError(error: Error): void {
  logger.error('統計情報サブスクリプションでエラーが発生しました:', error);
}

/**
 * 統計情報サブスクライバーを停止する
 */
export function stopStatisticsSubscriber(): void {
  if (statisticsSubscription) {
    logger.info('統計情報サブスクライバーを停止します');
    statisticsSubscription.removeListener('message', handleStatisticsMessage);
    statisticsSubscription.removeListener('error', handleSubscriptionError);
    statisticsSubscription = null;
  }
}

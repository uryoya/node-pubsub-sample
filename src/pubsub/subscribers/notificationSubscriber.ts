import { Subscription } from '@google-cloud/pubsub';
import { getPubSubClient, subscriptionExists } from '../client';
import { logger } from '../../utils/logger';
import { PubSubSubscription, PubSubTopic, TaskEvent } from '../../types';

/**
 * 通知サブスクリプションのキャッシュ
 */
let notificationSubscription: Subscription | null = null;

/**
 * 通知用サブスクリプションを作成または取得する
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
        // 60分経過したメッセージは再配信（デッドレター対策）
        messageRetentionDuration: { seconds: 60 * 60 },
        // 未確認メッセージの再配信を30秒後に行う
        ackDeadlineSeconds: 30,
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
 * タスク通知サブスクリプションを初期化
 */
export async function initializeNotificationSubscriber(): Promise<void> {
  if (notificationSubscription) {
    logger.info('通知サブスクライバーはすでに初期化されています');
    return;
  }

  try {
    // タスク作成トピックに対するサブスクリプションを作成
    notificationSubscription = await getOrCreateSubscription(
      PubSubTopic.TASK_CREATED,
      PubSubSubscription.TASK_NOTIFICATION,
    );

    // メッセージハンドラーを設定
    notificationSubscription.on('message', handleNotificationMessage);
    notificationSubscription.on('error', handleSubscriptionError);

    logger.info('通知サブスクライバーの初期化が完了しました');
  } catch (error) {
    logger.error('通知サブスクライバーの初期化中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * メッセージ処理ハンドラー
 */
function handleNotificationMessage(message: any): void {
  try {
    // メッセージデータをパースしてイベントオブジェクトを取得
    const eventData: TaskEvent = JSON.parse(message.data.toString());

    // イベントタイプに基づいて通知メッセージを生成
    let notificationMessage: string;

    switch (eventData.eventType) {
      case 'TASK_CREATED':
        notificationMessage = `新しいタスク「${eventData.task.title}」が作成されました`;
        break;
      case 'TASK_UPDATED':
        notificationMessage = `タスク「${eventData.task.title}」が更新されました`;
        break;
      case 'TASK_DELETED':
        notificationMessage = `タスク「${eventData.task.title}」が削除されました`;
        break;
      case 'TASK_STATUS_CHANGED':
        const previousStatus = eventData.metadata?.previousStatus || '不明';
        notificationMessage = `タスク「${eventData.task.title}」のステータスが ${previousStatus} から ${eventData.task.status} に変更されました`;
        break;
      default:
        notificationMessage = `タスクイベントを受信: ${eventData.eventType}`;
    }

    // 実際の通知処理（このPoCではログ出力のみ）
    logger.info(`【通知】: ${notificationMessage}`);

    // メッセージを確認済みとしてマーク
    message.ack();
  } catch (error) {
    logger.error('通知メッセージ処理中にエラーが発生しました:', error);
    // エラーが発生したメッセージは再処理のためnackする
    message.nack();
  }
}

/**
 * サブスクリプションエラーハンドラー
 */
function handleSubscriptionError(error: Error): void {
  logger.error('通知サブスクリプションでエラーが発生しました:', error);
}

/**
 * サブスクライバーを停止する
 */
export function stopNotificationSubscriber(): void {
  if (notificationSubscription) {
    logger.info('通知サブスクライバーを停止します');
    notificationSubscription.removeListener('message', handleNotificationMessage);
    notificationSubscription.removeListener('error', handleSubscriptionError);
    notificationSubscription = null;
  }
}

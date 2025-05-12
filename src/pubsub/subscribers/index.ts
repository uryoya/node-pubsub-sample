import { logger } from '../../utils/logger';
import {
  initializeNotificationSubscriber,
  stopNotificationSubscriber,
} from './notificationSubscriber';
import { initializeStatisticsSubscriber, stopStatisticsSubscriber } from './statisticsSubscriber';

/**
 * すべてのサブスクライバーを初期化する
 */
export async function initializeAllSubscribers(): Promise<void> {
  logger.info('すべてのPub/Subサブスクライバーの初期化を開始します');

  try {
    // 通知サブスクライバーの初期化
    await initializeNotificationSubscriber();

    // 統計情報サブスクライバーの初期化
    await initializeStatisticsSubscriber();

    logger.info('すべてのPub/Subサブスクライバーの初期化が完了しました');
  } catch (error) {
    logger.error('サブスクライバーの初期化中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * すべてのサブスクライバーを停止する
 */
export function stopAllSubscribers(): void {
  logger.info('すべてのPub/Subサブスクライバーを停止します');

  // 通知サブスクライバーを停止
  stopNotificationSubscriber();

  // 統計情報サブスクライバーを停止
  stopStatisticsSubscriber();

  logger.info('すべてのPub/Subサブスクライバーの停止が完了しました');
}

// エクスポート
export {
  initializeNotificationSubscriber,
  stopNotificationSubscriber,
} from './notificationSubscriber';
export { initializeStatisticsSubscriber, stopStatisticsSubscriber } from './statisticsSubscriber';

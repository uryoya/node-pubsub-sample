import { Topic } from '@google-cloud/pubsub';
import { getPubSubClient, topicExists } from '../client';
import { logger } from '../../utils/logger';
import { PubSubTopic } from '../../types';

/**
 * トピックオブジェクトのキャッシュ
 */
const topicCache: Record<string, Topic> = {};

/**
 * トピックを取得する（存在しない場合は作成）
 * @param topicName トピック名
 */
export async function getOrCreateTopic(topicName: string): Promise<Topic> {
  // キャッシュにあればそれを返す
  if (topicCache[topicName]) {
    return topicCache[topicName];
  }

  const pubsub = getPubSubClient();
  const topic = pubsub.topic(topicName);

  // トピックが存在するか確認
  const exists = await topicExists(topicName);

  if (!exists) {
    try {
      logger.info(`トピック ${topicName} が存在しないため作成します`);
      // トピックを作成
      await topic.create();
      logger.info(`トピック ${topicName} を作成しました`);
    } catch (error) {
      // 競合エラー（別プロセスがすでに作成した場合）は無視
      if (error instanceof Error && error.message.includes('ALREADY_EXISTS')) {
        logger.info(`トピック ${topicName} はすでに作成されています`);
      } else {
        logger.error(`トピック ${topicName} の作成中にエラーが発生しました:`, error);
        throw error;
      }
    }
  } else {
    logger.info(`トピック ${topicName} はすでに存在します`);
  }

  // キャッシュに保存
  topicCache[topicName] = topic;
  return topic;
}

/**
 * アプリケーションで使用するすべてのトピックを初期化する
 */
export async function initializeTopics(): Promise<void> {
  logger.info('Pub/Subトピックの初期化を開始します');

  try {
    // すべてのトピックを非同期で初期化
    const initPromises = Object.values(PubSubTopic).map(async topicName => {
      await getOrCreateTopic(topicName);
    });

    // すべての初期化が完了するのを待つ
    await Promise.all(initPromises);

    logger.info('すべてのPub/Subトピックの初期化が完了しました');
  } catch (error) {
    logger.error('トピック初期化中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * 特定のトピックオブジェクトを取得する
 * @param topicName トピック名
 */
export function getTopic(topicName: PubSubTopic): Topic {
  if (!topicCache[topicName]) {
    throw new Error(
      `トピック ${topicName} は初期化されていません。先に initializeTopics() を呼び出してください`,
    );
  }
  return topicCache[topicName];
}

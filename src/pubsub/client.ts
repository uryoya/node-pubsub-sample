import { PubSub, TopicMetadata } from '@google-cloud/pubsub';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Pub/Subクライアントのシングルトンインスタンス
 */
let pubsubClient: PubSub | null = null;

/**
 * Pub/Subクライアントを初期化する
 * エミュレータが設定されている場合はエミュレータに接続
 */
export function initPubSubClient(): PubSub {
  if (pubsubClient) {
    return pubsubClient;
  }

  const options: any = {
    projectId: config.pubsub.projectId,
  };

  // 環境変数からエミュレータホストを取得
  const emulatorHost = config.pubsub.emulatorHost;

  if (emulatorHost) {
    logger.info(`Pub/Subエミュレータを使用します: ${emulatorHost}`);
    // エミュレータ使用時は認証不要
    options.apiEndpoint = emulatorHost;
  } else {
    // 本番環境の場合はデフォルト認証を使用
    logger.info('Google Cloudの本番Pub/Subを使用します');
    // GCPの認証情報は環境変数GOOGLE_APPLICATION_CREDENTIALSから自動的に読み込まれる
  }

  pubsubClient = new PubSub(options);
  return pubsubClient;
}

/**
 * Pub/Subクライアントを取得する
 * クライアントが初期化されていない場合は初期化する
 */
export function getPubSubClient(): PubSub {
  if (!pubsubClient) {
    return initPubSubClient();
  }
  return pubsubClient;
}

/**
 * トピックが存在するか確認する
 * @param topicName トピック名
 */
export async function topicExists(topicName: string): Promise<boolean> {
  try {
    const pubsub = getPubSubClient();
    const [topics] = await pubsub.getTopics();
    return topics.some(topic => {
      // トピックのフルパスから名前部分だけを取り出して比較
      const fullTopicName = topic.name;
      const topicNameOnly = fullTopicName.split('/').pop();
      return topicNameOnly === topicName;
    });
  } catch (error) {
    logger.error(`トピック存在チェックエラー: ${error}`);
    return false;
  }
}

/**
 * サブスクリプションが存在するか確認する
 * @param subscriptionName サブスクリプション名
 */
export async function subscriptionExists(subscriptionName: string): Promise<boolean> {
  try {
    const pubsub = getPubSubClient();
    const [subscriptions] = await pubsub.getSubscriptions();
    return subscriptions.some(subscription => {
      // サブスクリプションのフルパスから名前部分だけを取り出して比較
      const fullSubscriptionName = subscription.name;
      const subscriptionNameOnly = fullSubscriptionName.split('/').pop();
      return subscriptionNameOnly === subscriptionName;
    });
  } catch (error) {
    logger.error(`サブスクリプション存在チェックエラー: ${error}`);
    return false;
  }
}

/**
 * Pub/Sub接続をテストする
 */
export async function testPubSubConnection(): Promise<boolean> {
  try {
    const pubsub = getPubSubClient();
    // トピック一覧を取得して接続テスト
    await pubsub.getTopics();
    logger.info('Pub/Sub接続テスト成功');
    return true;
  } catch (error) {
    logger.error(`Pub/Sub接続テストエラー: ${error}`);
    return false;
  }
}

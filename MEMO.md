# Google Cloud Pub/Sub 実装メモ

## 概要

このメモは、Node.js、TypeScript環境でのGoogle Cloud Pub/Subを使ったイベント駆動型アーキテクチャの実装についてまとめたものです。タスク管理システムにおけるイベント発行（パブリッシャー）と購読（サブスクライバー）のパターンを実装しました。

## 1. パブリッシャーの実装

### 基本構造

パブリッシャーは、アプリケーション内で発生したイベントをPub/Subトピックに発行する役割を持ちます。

```typescript
// 基本的なパブリッシュ関数
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
```

### イベント種別ごとのパブリッシュ関数

各イベントタイプに特化したパブリッシュ関数を実装することで、API呼び出し側のコードをシンプルに保てます。

```typescript
// タスク作成イベントの発行例
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
```

### パブリッシャーの利点

1. **関心の分離**: ビジネスロジックとイベント通知の責務を分離
2. **型安全性**: TypeScriptの型システムを活用した安全なイベントデータ構造
3. **柔軟性**: 新しいイベントタイプの追加が容易
4. **テスト容易性**: モックトピックを使用したユニットテストが可能

## 2. サブスクライバーの実装

### 基本構造

サブスクライバーは、特定のトピックに発行されたイベントを購読し、それに応じた処理を行います。

```typescript
// サブスクリプション作成/取得関数
async function getOrCreateSubscription(
  topicName: PubSubTopic,
  subscriptionName: string,
): Promise<Subscription> {
  const pubsub = getPubSubClient();

  // サブスクリプションが存在するか確認
  const exists = await subscriptionExists(subscriptionName);

  if (!exists) {
    // 存在しない場合は新規作成
    const topic = pubsub.topic(topicName);
    const [subscription] = await topic.createSubscription(subscriptionName, {
      messageRetentionDuration: { seconds: 60 * 60 },
      ackDeadlineSeconds: 30,
    });
    return subscription;
  }

  // 既存のサブスクリプションを取得
  return pubsub.subscription(subscriptionName);
}
```

### メッセージハンドラー

サブスクライバーは、メッセージ受信時のハンドラーを登録してイベント処理を行います。

```typescript
// メッセージハンドラーの例
function handleNotificationMessage(message: any): void {
  try {
    // メッセージデータをパースしてイベントオブジェクトを取得
    const eventData: TaskEvent = JSON.parse(message.data.toString());

    // イベント処理
    logger.info(`【通知】: 新しいタスク「${eventData.task.title}」が作成されました`);

    // メッセージを確認済みとしてマーク
    message.ack();
  } catch (error) {
    // エラー時は再処理のためnackする
    message.nack();
  }
}
```

### ライフサイクル管理

サブスクライバーは初期化と停止の管理が重要です。

```typescript
// 初期化
export async function initializeNotificationSubscriber(): Promise<void> {
  // サブスクリプション取得・作成
  notificationSubscription = await getOrCreateSubscription(
    PubSubTopic.TASK_CREATED,
    PubSubSubscription.TASK_NOTIFICATION,
  );

  // メッセージハンドラーを設定
  notificationSubscription.on('message', handleNotificationMessage);
  notificationSubscription.on('error', handleSubscriptionError);
}

// 停止処理
export function stopNotificationSubscriber(): void {
  if (notificationSubscription) {
    // イベントリスナーの削除
    notificationSubscription.removeListener('message', handleNotificationMessage);
    notificationSubscription.removeListener('error', handleSubscriptionError);
    notificationSubscription = null;
  }
}
```

## 3. 重要な考慮事項

### メッセージの重複処理

Pub/Subは「少なくとも1回の配信」を保証するため、メッセージが重複して処理される可能性があります。

対策:

1. **ACKメカニズム**: 処理完了後に`message.ack()`を呼び出して確認
2. **冪等性の確保**: 同じメッセージが複数回処理されても問題ないようにする
3. **メッセージIDを使った重複排除**: 処理済みメッセージのIDを記録して重複チェック

### エラーハンドリング

メッセージ処理中のエラーは適切に処理する必要があります。

```typescript
try {
  // メッセージ処理
  message.ack();
} catch (error) {
  logger.error('処理エラー:', error);
  message.nack(); // 再処理を要求
}
```

### グレースフルシャットダウン

アプリケーション終了時には、サブスクライバーを適切に停止させることが重要です。

```typescript
// シャットダウン処理
const shutdown = async () => {
  // サブスクライバーの停止
  stopAllSubscribers();

  // その他のクリーンアップ処理
};

// シグナルハンドラー
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

## 4. 実装パターン

### 通知パターン

イベント発生時に通知を送信するパターン。本実装では、タスク作成・更新・削除時のログ通知を実装。

```typescript
// 通知ハンドラーでのイベント種別に応じた処理
switch (eventData.eventType) {
  case 'TASK_CREATED':
    notificationMessage = `新しいタスク「${eventData.task.title}」が作成されました`;
    break;
  case 'TASK_UPDATED':
    notificationMessage = `タスク「${eventData.task.title}」が更新されました`;
    break;
  // ...
}
```

### 統計更新パターン

イベントに基づいて集計データを更新するパターン。本実装では、タスク統計情報の更新を実装。

```typescript
// タスクステータス変更時の統計更新
async function updateStatisticsForStatusChanged(eventData: TaskEvent): Promise<void> {
  const task = eventData.task;
  const previousStatus = eventData.metadata?.previousStatus as string;

  // 統計情報を更新
  await prisma.taskStatistics.update({
    where: { id: 'singleton' },
    data: {
      // 前のステータスのカウントを減らし、新しいステータスのカウントを増やす
      // ...
    },
  });
}
```

### イベントフィルタリング

特定の条件を満たすイベントのみを処理するパターン。

```typescript
// タスク更新イベントの中から優先度変更のみを処理
if (
  eventData.eventType === TaskEventType.TASK_UPDATED &&
  eventData.metadata?.previousTask?.priority
) {
  await updateStatisticsForPriorityChanged(
    eventData.task.priority as TaskPriority,
    eventData.metadata.previousTask.priority as TaskPriority,
  );
}
```

## 5. テストとデバッグ

### エミュレーターの利用

ローカル開発環境では、Google Cloud Pub/Subエミュレーターを使用して開発・テストが可能です。

```typescript
// エミュレーター接続
if (emulatorHost) {
  logger.info(`Pub/Subエミュレータを使用します: ${emulatorHost}`);
  options.apiEndpoint = emulatorHost;
}
```

### ログ出力の活用

Pub/Subの動作状況を確認するためにログ出力を活用します。

```typescript
logger.info(`イベント発行成功: ${eventData.eventType}, MessageID: ${messageId}`);
logger.info(`サブスクリプション ${subscriptionName} を作成しました`);
```

## 6. セキュリティ

本番環境では、以下のセキュリティ対策を考慮する必要があります。

1. **認証**: GCP認証情報の適切な管理
2. **認可**: Pub/Subトピックへのアクセス制御
3. **データ保護**: 機密データの暗号化
4. **監査**: イベント処理の監査ログ

## 7. 複数インスタンス環境での運用

Cloud RunやKubernetesのようなコンテナオーケストレーション環境で複数インスタンスを実行する場合の考慮点について説明します。

### 複数インスタンスでの動作特性

#### 問題なく動作する点

1. **パブリッシャー処理**:

   - 各インスタンスは独立してイベントを発行可能
   - Pub/Subサービスは大量のパブリッシャーからのメッセージを扱うよう設計されている

2. **トピック初期化**:
   - 冪等的に設計されており、複数インスタンスからの同時初期化でも競合エラーを適切に処理
   ```typescript
   if (error instanceof Error && error.message.includes('ALREADY_EXISTS')) {
     logger.info(`トピック ${topicName} はすでに作成されています`);
   }
   ```

#### 注意が必要な点

1. **サブスクライバー処理**:

   - 同一サブスクリプションに複数のリスナーが接続すると、メッセージは分散処理される
   - 特定のメッセージが特定のインスタンスで処理される保証はない
   - 統計情報更新など一貫性が重要な処理では注意が必要

2. **インスタンスのスケーリング**:
   - インスタンス終了時に処理中メッセージの扱いに注意
   - シャットダウン時間が短すぎると処理中メッセージが失われる可能性がある

### 対策と実装パターン

1. **グレースフルシャットダウン**:

   - シグナルハンドラーを使用したシャットダウン処理の実装

   ```typescript
   const shutdown = async () => {
     stopAllSubscribers();
     // その他のクリーンアップ処理
   };

   process.on('SIGTERM', shutdown);
   process.on('SIGINT', shutdown);
   ```

2. **冪等性の強化**:

   - 特に統計情報更新などでは、同一メッセージの重複処理を想定した設計
   - メッセージIDを使った重複排除機構の追加

   ```typescript
   async function processMessageWithDeduplication(messageId, processFn) {
     const processed = await checkIfProcessed(messageId);
     if (processed) return;

     await processFn();
     await markAsProcessed(messageId);
   }
   ```

3. **分散環境向けの追加設定**:

   - デッドレターキューの設定

   ```typescript
   const [subscription] = await topic.createSubscription(subscriptionName, {
     deadLetterPolicy: {
       deadLetterTopic: pubsub.topic('dead-letter-topic'),
       maxDeliveryAttempts: 5,
     },
   });
   ```

   - サブスクリプション設定の最適化

   ```typescript
   const [subscription] = await topic.createSubscription(subscriptionName, {
     // メッセージ保持期間を延長
     messageRetentionDuration: { seconds: 7 * 24 * 60 * 60 }, // 7日間
     // ACK期限を処理時間に合わせて調整
     ackDeadlineSeconds: 60,
     // フロー制御（各インスタンスの同時処理数制限）
     flowControl: {
       maxMessages: 100,
     },
   });
   ```

### Cloud Run固有の設定

1. **最小インスタンス数設定**:

   ```
   gcloud run deploy my-service --min-instances=1
   ```

   - 常に最低1つのインスタンスを稼働させ、コールドスタート問題を軽減
   - 特に通知処理などのサブスクライバーが常に動作している必要がある場合に有効

2. **インスタンス終了猶予期間の設定**:

   ```
   gcloud run deploy my-service --timeout=120
   ```

   - 処理中のメッセージを完了するための十分な時間を確保

3. **最大同時リクエスト数の設定**:
   ```
   gcloud run deploy my-service --concurrency=50
   ```
   - 各インスタンスが同時に処理するリクエスト数を制限
   - Pub/Subメッセージ処理の負荷に応じて調整

### モニタリングと運用

1. **メトリクス監視**:

   - 処理待ちメッセージ数
   - メッセージ処理時間
   - エラー率

2. **アラート設定**:

   - デッドレターメッセージの発生
   - 処理待ちメッセージの急増
   - サブスクリプション遅延の増加

3. **定期的なメンテナンス**:
   - 未処理の古いメッセージの確認
   - デッドレターキューの監視と対応

適切な設定と監視体制を整えることで、複数インスタンス環境でも信頼性の高いPub/Subアプリケーションを運用できます。

## まとめ

Google Cloud Pub/Subを使用したイベント駆動型アーキテクチャは、以下の利点を提供します。

1. **疎結合**: パブリッシャーとサブスクライバーの分離
2. **スケーラビリティ**: 処理の分散とスケールアウトが容易
3. **柔軟性**: 新しい機能や処理の追加が容易
4. **回復力**: メッセージの一時的な保存による障害耐性

適切な設計と実装により、アプリケーションの保守性と拡張性を高めることができます。

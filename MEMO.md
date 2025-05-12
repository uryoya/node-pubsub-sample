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

## 8. イベント発行失敗時の対策

Pub/Subへのイベント発行が失敗した場合、重要なイベントが失われる可能性があります。以下の対策を実装することでシステムの信頼性を向上させることができます。

### アウトボックスパターン

データベーストランザクションとイベント発行を確実に行うためのパターンです。

```typescript
async function createTaskWithEvent(taskData: CreateTaskDto): Promise<Task> {
  // トランザクション内でタスク作成とイベント記録を行う
  return prisma.$transaction(async tx => {
    // 1. タスクをデータベースに保存
    const task = await tx.task.create({
      data: {
        ...taskData,
      },
    });

    // 2. 発行予定のイベントをoutboxテーブルに記録
    await tx.outboxEvent.create({
      data: {
        eventType: 'TASK_CREATED',
        payload: JSON.stringify({
          taskId: task.id,
          task: task,
          timestamp: new Date().toISOString(),
        }),
        status: 'PENDING',
      },
    });

    return task;
  });
}
```

### デッドレターキュー

処理に失敗したメッセージを保存して後で分析・再処理するための仕組みです。

```typescript
const [subscription] = await topic.createSubscription(subscriptionName, {
  deadLetterPolicy: {
    deadLetterTopic: pubsub.topic('task-events-dead-letter'),
    maxDeliveryAttempts: 5,
  },
});
```

### サーキットブレーカーパターン

Pub/Subサービスに問題がある場合に一時的にイベント発行を停止し、システムリソースを保護するパターンです。

```typescript
class PubSubCircuitBreaker {
  private failureCount = 0;
  private readonly threshold = 5;
  private isOpen = false;
  private lastFailureTime = 0;
  private readonly resetTimeoutMs = 30000; // 30秒

  async publishWithCircuitBreaker<T>(topic: Topic, data: T): Promise<string | null> {
    // サーキットが開いている場合
    if (this.isOpen) {
      // リセット時間を経過しているか確認
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.isOpen = false;
        this.failureCount = 0;
      } else {
        logger.warn('サーキットブレーカーが開いています。イベント発行をスキップします。');
        return null;
      }
    }

    try {
      const dataBuffer = Buffer.from(JSON.stringify(data));
      const messageId = await topic.publish(dataBuffer);
      // 成功したらカウンタをリセット
      this.failureCount = 0;
      return messageId;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      // 失敗回数がしきい値を超えた場合、サーキットを開く
      if (this.failureCount >= this.threshold) {
        this.isOpen = true;
        logger.error('Pub/Sub接続の問題が検出されました。サーキットブレーカーを開きます。');
      }

      throw error;
    }
  }
}
```

### イベントの優先度付けと再試行メカニズム

重要度に応じたイベント処理と再試行ロジックを実装することで、システムの信頼性を向上させることができます。

```typescript
// イベント優先度の定義
enum EventPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// 優先度に基づく再試行設定
const retryConfig = {
  [EventPriority.HIGH]: {
    maxAttempts: 10,
    backoffMs: 1000, // 1秒から指数バックオフ
  },
  [EventPriority.MEDIUM]: {
    maxAttempts: 5,
    backoffMs: 2000,
  },
  [EventPriority.LOW]: {
    maxAttempts: 3,
    backoffMs: 5000,
  },
};

// 再試行ロジックを備えたイベント発行
async function publishEventWithRetry<T>(
  topic: Topic,
  eventData: T,
  priority: EventPriority,
): Promise<string> {
  const config = retryConfig[priority];
  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt < config.maxAttempts) {
    try {
      // 通常のイベント発行処理
      const messageId = await publishEvent(topic, eventData);
      return messageId;
    } catch (error) {
      lastError = error;
      attempt++;

      if (attempt < config.maxAttempts) {
        // 指数バックオフで待機時間を計算
        const delayMs = config.backoffMs * Math.pow(2, attempt - 1);
        logger.warn(
          `イベント発行に失敗しました。${delayMs}ms後に再試行します (${attempt}/${config.maxAttempts})`,
        );
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // 全ての再試行に失敗した場合
  logger.error(`イベント発行が${config.maxAttempts}回試行後も失敗しました`, lastError);
  throw lastError;
}
```

## 9. 重複処理防止の詳細実装

Pub/Subの「少なくとも1回の配信」保証に対応するため、より詳細な重複処理防止メカニズムを実装します。

### 一意のイベントIDの生成と管理

各イベントに一意のIDを付与し、処理済みイベントを記録することで重複処理を防止します。

```typescript
// イベント発行時に一意のIDを生成
function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// イベント発行時にIDを付与
async function publishTaskCreated(task: Task): Promise<string> {
  const eventId = generateEventId();

  const eventData: TaskEvent = {
    eventId,
    eventType: TaskEventType.TASK_CREATED,
    taskId: task.id,
    task: task,
    timestamp: new Date().toISOString(),
  };

  return publishEvent(getTopic(PubSubTopic.TASK_CREATED), eventData);
}
```

### サブスクライバー側での処理済みイベントチェック

データベースを使って処理済みイベントを記録し、重複処理を防止します。

```typescript
// 処理済みイベントのチェックと記録
async function processEventIdempotently(
  eventId: string,
  handler: () => Promise<void>,
): Promise<void> {
  // トランザクション内で処理済みチェックと処理実行を行う
  await prisma.$transaction(async tx => {
    // 処理済みイベントを検索
    const existingEvent = await tx.processedEvent.findUnique({
      where: { eventId },
    });

    // 既に処理済みの場合はスキップ
    if (existingEvent) {
      logger.info(`イベントID ${eventId} は既に処理済みです。スキップします。`);
      return;
    }

    // イベント処理を実行
    await handler();

    // 処理済みとして記録
    await tx.processedEvent.create({
      data: {
        eventId,
        processedAt: new Date(),
      },
    });
  });
}

// メッセージハンドラーでの使用例
function handleStatisticsMessage(message: any): void {
  try {
    const eventData: TaskEvent = JSON.parse(message.data.toString());
    const { eventId } = eventData;

    if (!eventId) {
      logger.warn('イベントIDがありません。処理をスキップします。');
      message.ack();
      return;
    }

    // 冪等性を保証しながらイベント処理
    processEventIdempotently(eventId, async () => {
      switch (eventData.eventType) {
        case TaskEventType.TASK_CREATED:
          await updateStatisticsForTaskCreated(eventData);
          break;
        case TaskEventType.TASK_STATUS_CHANGED:
          await updateStatisticsForStatusChanged(eventData);
          break;
        // 他のイベントタイプの処理...
      }
    })
      .then(() => message.ack())
      .catch(error => {
        logger.error('イベント処理エラー:', error);
        message.nack();
      });
  } catch (error) {
    logger.error('メッセージ処理エラー:', error);
    message.nack();
  }
}
```

### トランザクション保証によるデータ整合性の確保

データベーストランザクション内で統計情報の更新など一貫性が重要な処理を行います。

```typescript
// ステータス変更時の統計更新例
async function updateStatisticsForStatusChanged(eventData: TaskEvent): Promise<void> {
  const task = eventData.task;
  const previousStatus = eventData.metadata?.previousStatus as string;

  if (!previousStatus || previousStatus === task.status) {
    return; // ステータスに変更がない場合は処理しない
  }

  // トランザクション内で統計情報の更新を行う
  await prisma.$transaction(async tx => {
    // 現在の統計情報を取得
    const stats = await tx.taskStatistics.findUnique({
      where: { id: 'singleton' },
    });

    if (!stats) {
      // 統計レコードが存在しない場合は作成
      await tx.taskStatistics.create({
        data: {
          id: 'singleton',
          totalTasks: 1,
          todoCount: task.status === 'TODO' ? 1 : 0,
          inProgressCount: task.status === 'IN_PROGRESS' ? 1 : 0,
          doneCount: task.status === 'DONE' ? 1 : 0,
        },
      });
      return;
    }

    // 前のステータスのカウントを減らし、新しいステータスのカウントを増やす
    const updateData: any = {};

    // 前のステータスのカウントを減らす
    if (previousStatus === 'TODO') {
      updateData.todoCount = { decrement: 1 };
    } else if (previousStatus === 'IN_PROGRESS') {
      updateData.inProgressCount = { decrement: 1 };
    } else if (previousStatus === 'DONE') {
      updateData.doneCount = { decrement: 1 };
    }

    // 新しいステータスのカウントを増やす
    if (task.status === 'TODO') {
      updateData.todoCount = { increment: 1 };
    } else if (task.status === 'IN_PROGRESS') {
      updateData.inProgressCount = { increment: 1 };
    } else if (task.status === 'DONE') {
      updateData.doneCount = { increment: 1 };
    }

    // 統計情報を更新
    await tx.taskStatistics.update({
      where: { id: 'singleton' },
      data: updateData,
    });
  });
}
```

これらの実装パターンを組み合わせることで、Pub/Subを使ったイベント駆動型アーキテクチャにおける信頼性と一貫性を確保できます。

## まとめ

Google Cloud Pub/Subを使用したイベント駆動型アーキテクチャは、以下の利点を提供します。

1. **疎結合**: パブリッシャーとサブスクライバーの分離
2. **スケーラビリティ**: 処理の分散とスケールアウトが容易
3. **柔軟性**: 新しい機能や処理の追加が容易
4. **回復力**: メッセージの一時的な保存による障害耐性

適切な設計と実装により、アプリケーションの保守性と拡張性を高めることができます。

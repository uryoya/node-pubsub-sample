# Node.js Pub/Subパターン実装ガイド

このドキュメントは、Node.jsとTypeScriptを使用したGoogle Cloud Pub/Subの実装パターンと学習内容をまとめたものです。

## 1. 概要とアーキテクチャ

### Pub/Subパターンの基本概念

Pub/Subパターン（公開-購読型モデル）は、メッセージの送信者（パブリッシャー）が特定の受信者（サブスクライバー）を明示的に指定せずに、メッセージを発行するコミュニケーションパターンです。このパターンは以下の要素で構成されます：

- **パブリッシャー**: イベントを発行する側
- **トピック**: イベントが発行される先の論理的なチャネル
- **サブスクライバー**: 特定のトピックのイベントを受信する側
- **メッセージ**: 発行されるデータそのもの

### モノリスアプリケーションでのPub/Subの活用

モノリスアプリケーション内でもPub/Subパターンを活用することで、以下の利点が得られます：

- **関心の分離**: ビジネスロジックとイベント処理の責務を分離
- **拡張性**: 新しい機能追加時に既存コードを変更せずに処理を追加可能
- **将来のマイクロサービス化**: マイクロサービスへの移行が容易になる
- **テスト容易性**: ビジネスロジックとイベント処理を独立してテスト可能

### 非同期処理のメリット

Pub/Subを使った非同期処理には以下のメリットがあります：

- **パフォーマンス向上**: リクエスト処理とイベント処理を分離して応答性を向上
- **スケーラビリティ**: イベント処理部分を独立してスケーリング可能
- **回復力**: 一時的な障害があっても、メッセージが失われない
- **負荷分散**: イベント処理のピーク時にも安定した処理が可能

## 2. パブリッシャーの実装

### 基本構造と実装パターン

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
    eventId: generateEventId(), // 重複処理防止用のID
  };

  return publishEvent(topic, eventData);
}
```

### タイプセーフなイベント発行

TypeScriptの型システムを活用して、イベントデータの整合性を保証します。

```typescript
// イベントタイプの定義
enum TaskEventType {
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_DELETED = 'TASK_DELETED',
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
}

// 基本イベント構造
interface TaskEvent {
  eventId: string;
  eventType: TaskEventType;
  taskId: string;
  task: Task;
  timestamp: string;
  metadata?: Record<string, any>;
}

// イベント種別固有の型
interface TaskStatusChangedEvent extends TaskEvent {
  eventType: TaskEventType.TASK_STATUS_CHANGED;
  metadata: {
    previousStatus: string;
  };
}
```

## 3. サブスクライバーの実装

### 基本構造と初期化

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
function handleNotificationMessage(message: Message): void {
  try {
    // メッセージデータをパースしてイベントオブジェクトを取得
    const eventData: TaskEvent = JSON.parse(message.data.toString());

    // イベントタイプに応じた処理
    switch (eventData.eventType) {
      case TaskEventType.TASK_CREATED:
        logger.info(`【通知】: 新しいタスク「${eventData.task.title}」が作成されました`);
        break;
      case TaskEventType.TASK_UPDATED:
        logger.info(`【通知】: タスク「${eventData.task.title}」が更新されました`);
        break;
      case TaskEventType.TASK_DELETED:
        logger.info(`【通知】: タスク「${eventData.task.title}」が削除されました`);
        break;
      case TaskEventType.TASK_STATUS_CHANGED:
        const newStatus = eventData.task.status;
        const previousStatus = eventData.metadata?.previousStatus;
        logger.info(
          `【通知】: タスク「${eventData.task.title}」のステータスが ${previousStatus} から ${newStatus} に変更されました`,
        );
        break;
    }

    // メッセージを確認済みとしてマーク
    message.ack();
  } catch (error) {
    logger.error('メッセージ処理エラー:', error);
    // エラー時は再処理のためnackする
    message.nack();
  }
}
```

### ライフサイクル管理

サブスクライバーは初期化と停止の管理が重要です。

```typescript
// サブスクライバーを保持する変数
let notificationSubscription: Subscription | null = null;

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

  logger.info(`通知サブスクライバーを初期化しました: ${PubSubSubscription.TASK_NOTIFICATION}`);
}

// 停止処理
export function stopNotificationSubscriber(): void {
  if (notificationSubscription) {
    // イベントリスナーの削除
    notificationSubscription.removeListener('message', handleNotificationMessage);
    notificationSubscription.removeListener('error', handleSubscriptionError);
    notificationSubscription = null;

    logger.info(`通知サブスクライバーを停止しました`);
  }
}
```

## 4. 信頼性と耐障害性

### メッセージの重複処理対策

Pub/Subは「少なくとも1回の配信」を保証するため、メッセージが重複して処理される可能性があります。

対策:

1. **ACKメカニズム**: 処理完了後に`message.ack()`を呼び出して確認
2. **冪等性の確保**: 同じメッセージが複数回処理されても問題ないようにする
3. **メッセージIDを使った重複排除**: 処理済みメッセージのIDを記録して重複チェック

### 冪等性の確保

イベント処理は冪等（何度実行しても結果が同じ）である必要があります。

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
```

### イベント発行失敗時の対策

#### アウトボックスパターン

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

// 別のプロセス/ジョブでoutboxからイベントを取得して発行
async function processOutboxEvents(): Promise<void> {
  // 未発行のイベントを取得
  const pendingEvents = await prisma.outboxEvent.findMany({
    where: {
      status: 'PENDING',
    },
    take: 10, // バッチサイズ
  });

  for (const event of pendingEvents) {
    try {
      // イベントをPub/Subに発行
      const eventData = JSON.parse(event.payload);
      const topic = getTopic(event.eventType as PubSubTopic);
      await publishEvent(topic, eventData);

      // 発行成功したら状態を更新
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });
    } catch (error) {
      // エラー時はリトライカウントを増やす
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          retryCount: { increment: 1 },
          lastError: error.message,
          lastAttempt: new Date(),
        },
      });
    }
  }
}
```

## 5. 分散環境での運用

### 複数インスタンス環境での考慮点

Cloud RunやKubernetesのようなコンテナオーケストレーション環境で複数インスタンスを実行する場合の考慮点です。

#### 問題なく動作する点

1. **パブリッシャー処理**:

   - 各インスタンスは独立してイベントを発行可能
   - Pub/Subサービスは大量のパブリッシャーからのメッセージを扱うよう設計されている

2. **トピック初期化**:
   - 冪等的に設計されており、複数インスタンスからの同時初期化でも競合エラーを適切に処理

#### 注意が必要な点

1. **サブスクライバー処理**:

   - 同一サブスクリプションに複数のリスナーが接続すると、メッセージは分散処理される
   - 特定のメッセージが特定のインスタンスで処理される保証はない
   - 統計情報更新など一貫性が重要な処理では注意が必要

2. **インスタンスのスケーリング**:
   - インスタンス終了時に処理中メッセージの扱いに注意
   - シャットダウン時間が短すぎると処理中メッセージが失われる可能性がある

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

### グレースフルシャットダウン

アプリケーション終了時には、サブスクライバーを適切に停止させることが重要です。

```typescript
// シャットダウン処理
const shutdown = async () => {
  logger.info('アプリケーションのシャットダウンを開始します...');

  // サブスクライバーの停止
  stopNotificationSubscriber();
  stopStatisticsSubscriber();

  // 処理中のリクエスト完了を待機
  await new Promise(resolve => setTimeout(resolve, 5000));

  // データベース接続のクローズなど、その他のクリーンアップ処理
  await prisma.$disconnect();

  logger.info('アプリケーションのシャットダウンが完了しました');
  process.exit(0);
};

// シグナルハンドラー
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

## 6. テストとデバッグ

### エミュレーターの利用

ローカル開発環境では、Google Cloud Pub/Subエミュレーターを使用して開発・テストが可能です。

```typescript
// PubSubクライアントの初期化
function getPubSubClient(): PubSub {
  const options: ClientConfig = {
    projectId: process.env.PUBSUB_PROJECT_ID || 'task-project',
  };

  // エミュレーターホストが設定されている場合は、エミュレーターに接続
  const emulatorHost = process.env.PUBSUB_EMULATOR_HOST;
  if (emulatorHost) {
    logger.info(`Pub/Subエミュレータを使用します: ${emulatorHost}`);
    options.apiEndpoint = emulatorHost;
  }

  return new PubSub(options);
}
```

### ログ活用

Pub/Subの動作状況を確認するためにログ出力を活用します。

```typescript
// パブリッシャー側のログ
logger.info(`イベント発行: ${eventData.eventType}, TaskID: ${eventData.taskId}`);
logger.info(`イベント発行成功: ${eventData.eventType}, MessageID: ${messageId}`);

// サブスクライバー側のログ
logger.info(`サブスクリプション ${subscriptionName} を作成しました`);
logger.info(`イベント受信: ${eventData.eventType}, TaskID: ${eventData.taskId}`);
```

### テスト戦略

Pub/Sub関連コードのテストには以下の戦略が有効です：

1. **モックトピック/サブスクリプション**: 実際のPub/Subサービスを使わずにテスト
2. **エミュレーターを使ったインテグレーションテスト**: 実際のPub/Subの動作をテスト
3. **エンドツーエンドテスト**: システム全体での振る舞いをテスト

## 7. 実装パターン集

### 通知パターン

イベント発生時に通知を送信するパターン。本実装では、タスク作成・更新・削除時のログ通知を実装。

```typescript
// 通知ハンドラーでのイベント種別に応じた処理
function generateNotificationMessage(eventData: TaskEvent): string {
  switch (eventData.eventType) {
    case TaskEventType.TASK_CREATED:
      return `新しいタスク「${eventData.task.title}」が作成されました`;

    case TaskEventType.TASK_UPDATED:
      return `タスク「${eventData.task.title}」が更新されました`;

    case TaskEventType.TASK_DELETED:
      return `タスク「${eventData.task.title}」が削除されました`;

    case TaskEventType.TASK_STATUS_CHANGED:
      const newStatus = eventData.task.status;
      const previousStatus = eventData.metadata?.previousStatus;
      return `タスク「${eventData.task.title}」のステータスが ${previousStatus} から ${newStatus} に変更されました`;

    default:
      return `タスクイベントが発生しました: ${eventData.eventType}`;
  }
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

## 8. セキュリティとモニタリング

### アクセス制御

本番環境でのPub/Subへのアクセス制御：

- **サービスアカウント**: 適切な権限を持つサービスアカウントの使用
- **IAMロール**: 最小権限の原則に基づくロール設定
- **VPCサービスコントロール**: ネットワークレベルでのアクセス制限

### データ保護

機密データの保護：

- **機密データの扱い**: イベントメッセージに機密データを含めない
- **暗号化**: 必要に応じてメッセージの暗号化
- **データ分類**: データの重要度に応じた取り扱い

### メトリクス監視

重要な監視対象メトリクス：

- **未確認メッセージ数**: 処理待ちのメッセージ量
- **確認遅延**: メッセージの処理にかかる時間
- **配信エラー率**: メッセージ配信の失敗率
- **サブスクリプションバックログ**: 未処理のメッセージ数

### アラート設定

アラートをトリガーすべき状況：

- **デッドレターメッセージの発生**: 処理失敗のメッセージ
- **処理遅延の増加**: メッセージ処理の遅延
- **エラー率の上昇**: 処理エラーの急増
- **サブスクリプション切断**: サブスクライバーの接続問題

## 9. ベストプラクティスとまとめ

### 推奨される実装パターン

1. **イベントの構造化と型付け**: TypeScriptの型システムを活用
2. **冪等な処理**: 重複メッセージに対する頑健性
3. **トランザクション整合性**: アウトボックスパターンの活用
4. **グレースフルシャットダウン**: 処理中メッセージの適切な扱い
5. **適切なエラーハンドリング**: 失敗時の再処理戦略

### 避けるべきアンチパターン

1. **同期的なフローへの依存**: イベント処理の完了を同期的に待つ
2. **大量の小さなメッセージ**: パフォーマンスが低下する可能性
3. **不適切なACK/NACK**: メッセージの無限ループや早すぎる確認
4. **リトライ戦略の欠如**: 一時的な障害への対応不足
5. **監視の不足**: 問題の早期発見ができない

### まとめ

Pub/Subパターンは、イベント駆動型アーキテクチャにおいて重要な役割を果たします。適切に実装することで：

- **疎結合**: サービス間の依存関係を減らす
- **スケーラビリティ**: 個別にスケールできるコンポーネント
- **回復力**: 一部の障害がシステム全体に波及しない
- **メンテナンス性**: システムの変更や拡張が容易

この実装ガイドが、Node.jsとTypeScriptでPub/Subパターンを活用する際の参考になれば幸いです。

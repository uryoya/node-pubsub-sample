# Node.js モノリスアプリケーション PoC with Cloud Pub/Sub

このプロジェクトは、Node.js、TypeScript、Express.jsフレームワーク、およびGoogle Cloud Pub/Subを使用したモノリスアプリケーションのProof of Concept（PoC）です。

## プロジェクト概要

このPoCでは**シンプルなタスク管理システム**を実装します。このシステムでは：

- ユーザーがタスクを作成・更新・削除・取得できるRESTful API
- タスクの作成・更新・削除時にCloud Pub/Subを通じてイベントを発行
- イベントを購読して非同期処理を実行（通知の送信、ログ記録、統計情報の更新など）

これによって、モノリスアプリケーション内でのPub/Subパターンの実装方法とその利点を示します。

## アーキテクチャ概要

このアプリケーションは以下の主要コンポーネントで構成されています：

1. **Express.jsウェブサーバー**：
   - RESTful APIエンドポイントを提供
   - ミドルウェア処理（認証、ロギングなど）

2. **MySQLデータベース**：
   - タスクデータの永続化
   - 統計情報の保存

3. **Prisma ORM**：
   - データベーススキーマ管理
   - タイプセーフなデータアクセス

4. **Cloud Pub/Sub統合**：
   - 非同期メッセージングシステム
   - トピックの作成と管理
   - メッセージの発行（Publish）
   - サブスクリプションとメッセージ消費（Subscribe）

5. **ビジネスロジック層**：
   - サービスとユースケース実装
   - ドメインモデル
   - バリデーションロジック

## 技術スタック

- **言語**: TypeScript
- **ランタイム**: Node.js
- **Webフレームワーク**: Express.js
- **データベース**: MySQL
- **ORM**: Prisma
- **メッセージング**: Google Cloud Pub/Sub (エミュレータ)
- **コンテナ化**: Docker & Docker Compose
- **テスト**: 
  - ユニットテスト: Jest
  - E2Eテスト: k6
- **コード品質**: ESLint, Prettier

## プロジェクト構造

```
node-pubsub/
├── src/
│   ├── api/                # API エンドポイント
│   │   ├── controllers/    # リクエストハンドラ
│   │   ├── middlewares/    # Express ミドルウェア
│   │   ├── routes/         # エンドポイント定義
│   │   └── validation/     # 入力バリデーション
│   ├── config/             # アプリケーション設定
│   ├── domain/             # ドメインモデルとビジネスロジック
│   │   ├── models/         # データモデル
│   │   └── services/       # ビジネスロジック
│   ├── pubsub/             # Pub/Sub関連機能
│   │   ├── publishers/     # メッセージ発行機能
│   │   ├── subscribers/    # サブスクライバーとメッセージ処理
│   │   └── topics/         # トピック定義と管理
│   ├── utils/              # ユーティリティ関数
│   ├── app.ts              # Express アプリケーション設定
│   └── server.ts           # アプリケーションエントリーポイント
├── prisma/                 # Prismaスキーマと設定
├── tests/                  # テストファイル
│   ├── unit/               # ユニットテスト
│   └── e2e/                # E2Eテスト (k6)
├── docker/                 # Docker関連ファイル
├── .eslintrc.js            # ESLint 設定
├── .prettierrc             # Prettier 設定
├── jest.config.js          # Jest 設定
├── docker-compose.yml      # Docker Compose設定
├── Dockerfile              # アプリケーションDockerfile
├── package.json            # プロジェクト依存関係
├── tsconfig.json           # TypeScript 設定
└── README.md               # プロジェクト説明（このファイル）
```

## 実装内容

このPoCでは以下の機能を実装します：

1. **タスク管理API**:
   - タスクのCRUD操作（作成・読取・更新・削除）を提供するRESTfulエンドポイント
   - タスクのステータス変更API（未完了→完了など）
   - タスクの検索・フィルタリング機能
   - JSONレスポンス形式

2. **Pub/Subイベント連携**:
   - タスク関連イベントのトピック作成（例：`task-created`, `task-updated`, `task-deleted`）
   - APIリクエスト処理後にイベントをPub/Subに発行
   - イベントメッセージの標準形式の定義

3. **イベント処理サブスクライバー** (2つに絞る):
   - 通知処理サブスクライバー（コンソールログ出力）
   - 統計情報更新サブスクライバー（タスク総数、完了数などの集計）

4. **E2Eテスト**:
   - k6を使用したAPIとPub/Subイベント処理のE2Eテスト
   - 負荷テストシナリオ（タスク作成・更新のスループット計測）

## ユースケース一覧

このPoCでは以下のユースケースを実装します：

1. **ユーザーとしてのタスク管理**:
   - タスクの作成：タイトル、説明、期限、優先度を指定して新規タスクを作成
   - タスク一覧の取得：フィルタリングとソートオプション付き
   - タスク詳細の取得：IDによるタスク情報の参照
   - タスクの更新：タスク情報の変更（タイトル、説明、期限、優先度）
   - タスクのステータス変更：未完了→進行中→完了などの状態遷移
   - タスクの削除：不要なタスクの削除

2. **システムとしてのイベント処理**:
   - タスク作成通知：新規タスク作成時に通知を送信（このPoCではログ出力のみ）
   - タスク統計更新：タスク状態変更時に統計情報を更新（総数、状態別集計など）

3. **管理者としての利用**:
   - システム状態の確認：アクティブなサブスクリプションの確認
   - 統計情報の取得：タスク統計の確認用API

## セットアップ手順

### 前提条件

- Docker と Docker Compose
- Node.js (ローカル開発用、オプション)
- k6 (E2Eテスト用)

### インストール

1. リポジトリをクローン:
   ```
   git clone [repository-url]
   cd node-pubsub
   ```

2. Docker Composeでアプリケーションを起動:
   ```
   docker-compose up -d
   ```

3. Prismaマイグレーションの実行:
   ```
   docker-compose exec app npx prisma migrate dev
   ```

4. アプリケーションのアクセス:
   ```
   # APIは以下のURLでアクセス可能
   http://localhost:3000/api
   ```

5. E2Eテストの実行:
   ```
   # k6をインストールしていない場合
   # MacOS: brew install k6
   # Windows: choco install k6
   # その他: https://k6.io/docs/get-started/installation/

   # テスト実行
   k6 run tests/e2e/tasks-api.js
   ```

## 開発ガイドライン

- コミットメッセージは[Conventional Commits](https://www.conventionalcommits.org/)形式に従う
- 新機能開発は機能ブランチを作成して行う
- コードはプルリクエスト経由でマージ
- テストはできるだけ書く

## Cloud Pub/Sub の使用例 (タスク作成イベント)

```typescript
// src/pubsub/publishers/taskPublisher.ts
import { PubSub } from '@google-cloud/pubsub';
import { Task } from '@prisma/client';

export async function publishTaskCreated(task: Task): Promise<string> {
  const pubsub = new PubSub();
  const topicName = 'task-created';
  
  const eventData = {
    eventType: 'TASK_CREATED',
    timestamp: new Date().toISOString(),
    taskId: task.id,
    taskData: task
  };
  
  const dataBuffer = Buffer.from(JSON.stringify(eventData));
  const messageId = await pubsub.topic(topicName).publish(dataBuffer);
  return messageId;
}
```

### メッセージ購読 (タスク作成イベント処理)

```typescript
// src/pubsub/subscribers/taskNotificationSubscriber.ts
import { PubSub } from '@google-cloud/pubsub';
import { logger } from '@/utils/logger';
import { prisma } from '@/lib/prisma';

export function subscribeToTaskCreated(): void {
  const pubsub = new PubSub();
  const subscriptionName = 'task-created-notification';
  
  const subscription = pubsub.subscription(subscriptionName);
  
  subscription.on('message', async (message) => {
    try {
      const data = JSON.parse(message.data.toString());
      logger.info(`タスク作成通知: タスクID ${data.taskId}`);
      
      // 例: 通知処理を実行
      // sendNotification(`新しいタスク「${data.taskData.title}」が作成されました`);
      
      // 処理完了を確認
      message.ack();
    } catch (error) {
      logger.error('メッセージ処理エラー:', error);
      message.nack();
    }
  });
  
  subscription.on('error', (error) => {
    logger.error('Subscription error:', error);
  });
  
  logger.info(`タスク作成イベントの購読を開始: ${subscriptionName}`);
}
```

## 将来の拡張可能性

- ユーザー認証とアクセス制御
- マイクロサービスへの段階的移行
- CI/CDパイプライン
- モニタリング機能の追加

---

*このPoC実装はあくまで学習とプロトタイピングのためのものであり、本番環境への直接デプロイは推奨されません。*

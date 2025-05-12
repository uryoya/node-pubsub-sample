# 実装手順リスト

## アーキテクチャと技術選定（変更点）

- データベース：MySQL（インメモリではなく）
- ORM：Prisma
- ローカル環境：Docker Composeで全体構築
  - アプリケーション
  - MySQL
  - Pub/Subエミュレータ
- テスト手法：テスト駆動開発（E2Eテスト先行）

## 実装スケジュールと優先順位

1. **フェーズ1: 開発環境構築** (優先度: 最高)
   - Docker Compose設定
   - MySQL & Prisma設定
   - Pub/Subエミュレータ設定

2. **フェーズ2: E2Eテスト作成** (優先度: 最高)
   - k6によるE2Eテスト（APIと振る舞いを先に定義）
   - テストデータ準備

3. **フェーズ3: バックエンド基盤実装** (優先度: 高)
   - Express.js設定
   - Prismaモデル定義
   - ドメインモデル実装

4. **フェーズ4: API実装** (優先度: 高)
   - RESTful API実装
   - バリデーション
   - エラーハンドリング

5. **フェーズ5: Pub/Sub統合** (優先度: 高)
   - トピック管理
   - パブリッシャー・サブスクライバー実装

6. **フェーズ6: リファクタリングとドキュメント** (優先度: 中)
   - 必要に応じたリファクタリング
   - APIドキュメント作成

## 初期セットアップ

- [x] プロジェクト構造の定義とREADME作成
- [x] 基本的な開発環境セットアップ (TypeScript, ESLint, Prettier)
- [ ] Docker Compose設定
  - [ ] アプリケーションコンテナ定義
  - [ ] MySQL設定
  - [ ] Pub/Subエミュレータ設定
- [ ] Prisma ORM設定
  - [ ] スキーマ定義
  - [ ] マイグレーション
- [ ] 必要なパッケージのインストール
  - [x] Express、TypeScript、その他基本パッケージをインストール済み
  - [ ] Prisma関連パッケージ追加
  - [ ] Cloud Pub/Sub関連パッケージの確認
  - [ ] k6のインストール（E2Eテスト用）
- [ ] 環境変数設定ファイル (.env) の作成
  - [ ] アプリケーション基本設定
  - [ ] MySQL接続情報
  - [ ] Pub/Subエミュレータ設定

## E2Eテスト実装

- [ ] k6テスト作成
  - [ ] タスクAPI作成テスト
  - [ ] タスク一覧取得テスト
  - [ ] タスク更新テスト
  - [ ] タスクステータス変更テスト
  - [ ] タスク削除テスト
- [ ] テストシナリオ定義
  - [ ] イベント発行確認
  - [ ] 統計情報更新確認

## バックエンド基盤

- [ ] Express.jsアプリケーションのベース構築
  - [ ] server.ts と app.ts の作成
  - [ ] ミドルウェア設定 (cors, helmet, bodyParser, etc.)
  - [ ] エラーハンドリング
  - [ ] ロギング (winston)
- [ ] 設定管理システム実装 (src/config/)
  - [ ] 環境変数の読み込みと検証
  - [ ] アプリケーション設定の管理
- [ ] Prisma設定
  - [ ] クライアント初期化
  - [ ] リポジトリパターン実装

## ドメインモデルとビジネスロジック

- [ ] タスクモデル定義 (src/domain/models/)
  - [ ] タスクインターフェースと型定義
  - [ ] タスクのステータス定義 (enum)
- [ ] タスクサービス実装 (src/domain/services/)
  - [ ] タスク操作用のビジネスロジック
  - [ ] バリデーションルール
- [ ] ユニットテスト（必要に応じて）

## API実装

- [ ] ルーターの設定 (src/api/routes/)
  - [ ] タスクルーターの実装
  - [ ] ヘルスチェックエンドポイント
- [ ] コントローラー実装 (src/api/controllers/)
  - [ ] タスク作成コントローラー
  - [ ] タスク取得コントローラー（一覧・個別）
  - [ ] タスク更新コントローラー
  - [ ] タスク削除コントローラー
  - [ ] タスクステータス変更コントローラー
- [ ] バリデーション実装 (src/api/validation/)
  - [ ] 入力バリデーションミドルウェア (Joi)
  - [ ] バリデーションスキーマ定義
- [ ] ユニットテスト（必要に応じて）

## Cloud Pub/Sub統合

- [ ] Pub/Subエミュレータ接続設定
- [ ] Pub/Sub初期化とトピック管理 (src/pubsub/topics/)
  - [ ] 必要なトピックの作成
  - [ ] トピック存在確認と初期化
- [ ] パブリッシャー実装 (src/pubsub/publishers/)
  - [ ] タスク作成イベント発行
  - [ ] タスク更新イベント発行
  - [ ] タスク削除イベント発行
  - [ ] タスクステータス変更イベント発行
- [ ] サブスクライバー実装 (src/pubsub/subscribers/)
  - [ ] 通知処理サブスクライバー
  - [ ] 統計情報更新サブスクライバー
- [ ] イベントハンドラー統合
  - [ ] APIコントローラーからパブリッシャー呼び出し
  - [ ] アプリケーション起動時のサブスクライバー登録
- [ ] ユニットテスト（必要に応じて）

## 統計情報管理

- [ ] 統計情報モデル定義（Prismaスキーマに追加）
- [ ] 統計情報サービス実装
- [ ] 統計情報APIエンドポイント
- [ ] ユニットテスト（必要に応じて）

## ドキュメント

- [ ] APIドキュメント作成
- [ ] イベントスキーマドキュメント
- [ ] セットアップと実行手順の更新

## 最終確認

- [ ] E2Eテスト実行と検証
- [ ] README.mdの最終更新

## データモデル設計

### Prismaスキーマ（案）

```prisma
// schema.prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Task {
  id          String       @id @default(uuid())
  title       String
  description String?
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  dueDate     DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@map("tasks")
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
}

model TaskStatistics {
  id             String   @id @default("singleton")
  totalTasks     Int      @default(0)
  todoTasks      Int      @default(0)
  inProgressTasks Int      @default(0)
  doneTasks      Int      @default(0)
  lowPriority    Int      @default(0)
  mediumPriority Int      @default(0)
  highPriority   Int      @default(0)
  createdToday   Int      @default(0)
  completedToday Int      @default(0)
  lastUpdated    DateTime @default(now())

  @@map("task_statistics")
}
```

### イベントメッセージ形式

```typescript
interface TaskEvent {
  eventType: TaskEventType;
  taskId: string;
  task: Task;
  timestamp: string; // ISO形式の日時文字列
  metadata?: Record<string, any>;
}

enum TaskEventType {
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_DELETED = 'TASK_DELETED',
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED'
}
```

### Docker Compose設定（案）

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - mysql
      - pubsub
    environment:
      - DATABASE_URL=mysql://user:password@mysql:3306/taskdb
      - PUBSUB_EMULATOR_HOST=pubsub:8085
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=taskdb
      - MYSQL_USER=user
      - MYSQL_PASSWORD=password
    ports:
      - "3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql

  pubsub:
    image: gcr.io/google.com/cloudsdktool/cloud-sdk:emulators
    entrypoint: gcloud beta emulators pubsub start --host-port=0.0.0.0:8085
    ports:
      - "8085:8085"

volumes:
  mysql-data:
``` 
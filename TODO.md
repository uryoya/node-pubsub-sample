# 実装手順リスト

## アーキテクチャと技術選定（変更点）

- データベース：MySQL（インメモリではなく）
- ORM：Prisma
- ローカル環境：Docker Composeで全体構築
  - アプリケーション
  - MySQL
  - Pub/Subエミュレータ
- テスト手法：テスト駆動開発（E2Eテスト先行）
- 実装パターン：トランザクションスクリプトパターン（シンプルCRUD向け）

## 実装スケジュールと優先順位

1. **フェーズ1: 開発環境構築** (優先度: 最高) - [x]

   - Docker Compose設定
   - MySQL & Prisma設定
   - Pub/Subエミュレータ設定

2. **フェーズ2: E2Eテスト作成** (優先度: 最高) - [x]

   - k6によるE2Eテスト（APIと振る舞いを先に定義）
   - テストデータ準備

3. **フェーズ3: バックエンド基盤実装** (優先度: 高) - [x]

   - Express.js設定
   - Prismaクライアント初期化
   - 設定管理システム

4. **フェーズ4: API実装 (トランザクションスクリプト方式)** (優先度: 高) - [x]

   - タスク型定義とステータスenum
   - RESTful APIルーターとコントローラー
   - バリデーション
   - エラーハンドリング

5. **フェーズ5: Pub/Sub統合** (優先度: 高) - [ ]

   - トピック管理
   - パブリッシャー・サブスクライバー実装

6. **フェーズ6: リファクタリングとドキュメント** (優先度: 中) - [ ]
   - 必要に応じたリファクタリング
   - APIドキュメント作成

## 初期セットアップ

- [x] プロジェクト構造の定義とREADME作成
- [x] 基本的な開発環境セットアップ (TypeScript, ESLint, Prettier)
- [x] Docker Compose設定
  - [x] アプリケーションコンテナ定義
  - [x] MySQL設定
  - [x] Pub/Subエミュレータ設定
- [x] Prisma ORM設定
  - [x] スキーマ定義
  - [x] マイグレーション設定
- [x] 基本パッケージのインストール
  - [x] Express、TypeScript、その他基本パッケージをインストール済み
  - [x] Prisma関連パッケージ追加
  - [x] Cloud Pub/Sub関連パッケージの確認

## データアクセス層

- [x] 環境変数設定ファイル (.env) の作成
  - [x] アプリケーション基本設定
  - [x] MySQL接続情報
  - [x] Pub/Subエミュレータ設定

## E2Eテスト実装

- [x] k6テスト作成
  - [x] タスクAPI作成テスト
  - [x] タスク一覧取得テスト
  - [x] タスク更新テスト
  - [x] タスクステータス変更テスト
  - [x] タスク削除テスト
- [x] テストシナリオ定義
  - [x] イベント発行確認
  - [x] 統計情報更新確認

## バックエンド基盤

- [x] Express.jsアプリケーションのベース構築
  - [x] server.ts と app.ts の作成
  - [x] ミドルウェア設定 (cors, helmet, bodyParser, etc.)
  - [x] エラーハンドリング
  - [x] ロギング (winston)
- [x] 設定管理システム実装 (src/config/)
  - [x] 環境変数の読み込みと検証
  - [x] アプリケーション設定の管理
- [x] Prisma設定
  - [x] クライアント初期化と共通インスタンス

## API実装 (トランザクションスクリプト方式)

- [x] 共通型定義 (src/types/)
  - [x] タスク関連の型定義
  - [x] ステータスとプライオリティのenum
- [x] ルーターの設定 (src/api/routes/)
  - [x] タスクルーターの実装
  - [x] ヘルスチェックエンドポイント
- [x] コントローラー実装 (src/api/controllers/)
  - [x] タスク作成コントローラー (Prismaを直接使用)
  - [x] タスク取得コントローラー（一覧・個別）
  - [x] タスク更新コントローラー
  - [x] タスク削除コントローラー
  - [x] タスクステータス変更コントローラー
- [x] バリデーション実装 (src/api/validation/)
  - [x] 入力バリデーションミドルウェア
  - [x] バリデーションスキーマ定義

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
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
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
      - '3000:3000'
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
      - '3306:3306'
    volumes:
      - mysql-data:/var/lib/mysql

  pubsub:
    image: gcr.io/google.com/cloudsdktool/cloud-sdk:emulators
    entrypoint: gcloud beta emulators pubsub start --host-port=0.0.0.0:8085
    ports:
      - '8085:8085'

volumes:
  mysql-data:
```

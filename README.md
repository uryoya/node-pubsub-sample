以下の内容はCursorによって作成されました。

---

# Node.js モノリスアプリケーション PoC with Cloud Pub/Sub

このプロジェクトは、Node.js、TypeScript、Express.jsフレームワーク、およびGoogle Cloud Pub/Subを使用したモノリスアプリケーションのProof of Concept（PoC）です。

## プロジェクト概要

このPoCでは**シンプルなタスク管理システム**を実装します。このシステムでは：

- ユーザーがタスクを作成・更新・削除・取得できるRESTful API
- タスクの作成・更新・削除時にCloud Pub/Subを通じてイベントを発行
- イベントを購読して非同期処理を実行（通知の送信、ログ記録、統計情報の更新など）

これによって、モノリスアプリケーション内でのPub/Subパターンの実装方法とその利点を示します。

## ドキュメント

詳細なドキュメントは以下のリンクから参照できます：

- [APIドキュメント](docs/api.md) - API仕様とエンドポイント詳細
- [イベントスキーマドキュメント](docs/events.md) - Pub/Subトピックとイベント形式
- [セットアップガイド](docs/setup.md) - 環境構築と実行手順
- [ユースケース](docs/usecases.md) - システムのユースケース詳細
- [Pub/Sub実装ガイド](docs/pubsub-guide.md) - Pub/Subパターンの実装方法と学習内容
- [アーキテクチャ](docs/architecture.md) - システムアーキテクチャと構成図

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

詳細なアーキテクチャ図は[こちら](docs/architecture.md)を参照してください。

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
├── docs/                   # ドキュメント
├── docker/                 # Docker関連ファイル
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

3. **イベント処理サブスクライバー**:
   - 通知処理サブスクライバー（コンソールログ出力）
   - 統計情報更新サブスクライバー（タスク総数、完了数などの集計）

## クイックセットアップ

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
   docker compose exec app npx prisma db push
   ```

3. APIにアクセス:
   ```
   # APIは以下のURLでアクセス可能
   http://localhost:3000/api/health
   ```

より詳細なセットアップ手順は[セットアップガイド](docs/setup.md)を参照してください。

## 開発ガイドライン

- コミットメッセージは[Conventional Commits](https://www.conventionalcommits.org/)形式に従う
- 新機能開発は機能ブランチを作成して行う
- コードはプルリクエスト経由でマージ
- テストはできるだけ書く

## 将来の拡張可能性

- ユーザー認証とアクセス制御
- マイクロサービスへの段階的移行
- CI/CDパイプライン
- モニタリング機能の追加

---

_このPoC実装はあくまで学習とプロトタイピングのためのものであり、本番環境への直接デプロイは推奨されません。_

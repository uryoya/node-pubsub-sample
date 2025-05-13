# Node.js タスク管理システム セットアップガイド

このドキュメントでは、Node.js Pub/Subプロジェクトのセットアップと実行方法について説明します。

## 前提条件

このプロジェクトを実行するには、以下のソフトウェアが必要です：

- Docker および Docker Compose (v2)
- Node.js 18以上（ローカル開発用）
- npm 8以上（ローカル開発用）

## 環境構成

このプロジェクトは以下のコンポーネントで構成されています：

1. **アプリケーションサーバー**：Express.jsで実装されたRESTful API
2. **MySQL**：タスクのデータを保存するデータベース
3. **Pub/Subエミュレータ**：Google Cloud Pub/Subのエミュレータ

## セットアップ手順

### Dockerを使用した環境構築（推奨）

1. リポジトリをクローンします：

```bash
git clone <リポジトリURL>
cd node-pubsub
```

2. Docker Composeを使用して環境を起動します：

```bash
docker compose up -d
```

これにより、3つのコンテナ（アプリケーション、MySQL、Pub/Subエミュレータ）が起動します。
初回起動時には、Dockerイメージのビルドとデータベースの初期化が行われます。

3. アプリケーションが起動したら、以下のURLでアクセスできます：

```
http://localhost:3000/api/health
```

### ローカル開発環境のセットアップ

ローカル環境で開発する場合は、以下の手順に従います：

1. 依存関係をインストールします：

```bash
npm install
```

2. MySQLとPub/Subエミュレータのみをコンテナで起動します：

```bash
docker compose up -d mysql pubsub
```

3. 環境変数を設定します。`.env`ファイルを作成し、以下の内容を記述します：

```
DATABASE_URL=mysql://user:password@localhost:3306/taskdb
PUBSUB_EMULATOR_HOST=localhost:8085
PUBSUB_PROJECT_ID=task-project
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
```

4. Prismaクライアントを生成します：

```bash
npx prisma generate
```

5. マイグレーションを実行します：

```bash
npx prisma migrate dev
```

6. 開発サーバーを起動します：

```bash
npm run dev
```

## データベース管理

### Prisma Studio

データベースの内容を視覚的に確認・編集するには、Prisma Studioが便利です：

```bash
# Dockerコンテナ内で実行する場合
docker compose exec app npx prisma studio

# ローカル環境で実行する場合
npx prisma studio
```

Prisma Studioは`http://localhost:5555`で利用できます。

### マイグレーションの実行

データベーススキーマを変更した場合は、マイグレーションを作成して適用する必要があります：

```bash
# ローカル環境でマイグレーション作成
npx prisma migrate dev --name <変更の説明>

# Dockerコンテナ内でマイグレーション適用
docker compose exec app npx prisma migrate deploy
```

## APIエンドポイント

APIの詳細については、[APIドキュメント](./api.md)を参照してください。

主要なエンドポイントは以下の通りです：

- `GET /api/health` - ヘルスチェック
- `GET /api/tasks` - タスク一覧の取得
- `POST /api/tasks` - 新しいタスクの作成
- `GET /api/statistics` - タスク統計情報の取得

## Pub/Subトピックとイベント

Pub/Subトピックとイベントスキーマの詳細については、[イベントスキーマドキュメント](./events.md)を参照してください。

## 一般的な操作

### アプリケーションの起動と停止

```bash
# 起動
docker compose up -d

# 停止
docker compose down

# ログの確認
docker compose logs -f app
```

### コンテナのリビルド

アプリケーションのコードを変更した場合は、コンテナをリビルドする必要があります：

```bash
docker compose build app
docker compose up -d app
```

### データベースのリセット

開発中にデータベースをリセットしたい場合は、以下のコマンドを実行します：

```bash
# ボリュームを含めて停止（データを削除）
docker compose down -v

# 再起動
docker compose up -d
```

## トラブルシューティング

### 接続エラー

MySQLやPub/Subエミュレータへの接続エラーが発生した場合：

1. コンテナが起動しているか確認します：

```bash
docker compose ps
```

2. エラーログを確認します：

```bash
docker compose logs mysql
docker compose logs pubsub
```

### マイグレーションエラー

マイグレーション実行時にエラーが発生した場合：

1. Prismaスキーマに構文エラーがないか確認します
2. データベース接続文字列を確認します
3. 必要に応じてマイグレーションをリセットします：

```bash
npx prisma migrate reset
```

### Pub/Subエミュレータの問題

Pub/Subエミュレータに関する問題が発生した場合：

1. エミュレータのログを確認します：

```bash
docker compose logs pubsub
```

2. 環境変数が正しく設定されているか確認します：

```bash
docker compose exec app env | grep PUBSUB
```

## 開発のベストプラクティス

1. **コードスタイル**：コードをコミットする前に、リンターとフォーマッターを実行します：

```bash
npm run lint
npm run format
```

2. **型安全性**：TypeScriptの型システムを活用して、型安全なコードを書きます。

3. **テスト**：機能を追加・変更した場合は、E2Eテストを実行して動作を確認します。

4. **ドキュメント**：APIやイベントスキーマに変更を加えた場合は、対応するドキュメントも更新します。

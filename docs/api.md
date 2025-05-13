# Node.js タスク管理 API ドキュメント

このドキュメントは、Node.js Pub/Subプロジェクトで実装されているRESTful APIエンドポイントの詳細を説明します。

## 基本情報

- **ベースURL**: `http://localhost:3000`（開発環境）
- **Content-Type**: `application/json`
- **文字コード**: UTF-8

## API概要

| カテゴリ                          | 説明                                     |
| --------------------------------- | ---------------------------------------- |
| [ヘルスチェック](#ヘルスチェック) | APIの稼働状態を確認するエンドポイント    |
| [タスク管理](#タスク管理)         | タスクのCRUD操作を行うエンドポイント     |
| [統計情報](#統計情報)             | タスクの統計情報を取得するエンドポイント |

---

## ヘルスチェック

### ヘルスチェックエンドポイント

APIサーバーが正常に稼働しているかを確認します。

```
GET /api/health
```

#### レスポンス

```json
{
  "status": "success",
  "message": "API is running",
  "timestamp": "2023-09-16T12:34:56.789Z"
}
```

#### ステータスコード

- `200 OK`: サーバーが正常に動作している

---

## タスク管理

### タスク一覧の取得

タスクの一覧を取得します。クエリパラメータによるフィルタリング、ソート、ページネーションに対応しています。

```
GET /api/tasks
```

#### クエリパラメータ

| パラメータ  | 型     | 必須   | 説明                                                                |
| ----------- | ------ | ------ | ------------------------------------------------------------------- |
| `status`    | string | いいえ | タスクのステータスでフィルタリング（`TODO`, `IN_PROGRESS`, `DONE`） |
| `priority`  | string | いいえ | タスクの優先度でフィルタリング（`LOW`, `MEDIUM`, `HIGH`）           |
| `search`    | string | いいえ | タイトルまたは説明に含まれるテキストで検索                          |
| `sortBy`    | string | いいえ | ソートする項目（`createdAt`, `updatedAt`, `dueDate`, `title`など）  |
| `sortOrder` | string | いいえ | ソート順（`asc` または `desc`）、デフォルトは `desc`                |
| `page`      | number | いいえ | ページ番号、デフォルトは `1`                                        |
| `limit`     | number | いいえ | 1ページあたりの項目数、デフォルトは `10`                            |

#### レスポンス例

```json
{
  "status": "success",
  "data": {
    "tasks": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "title": "ドキュメントを作成する",
        "description": "APIドキュメントを作成する",
        "status": "TODO",
        "priority": "HIGH",
        "dueDate": "2023-09-30T23:59:59.999Z",
        "createdAt": "2023-09-16T12:34:56.789Z",
        "updatedAt": "2023-09-16T12:34:56.789Z"
      },
      {
        "id": "223e4567-e89b-12d3-a456-426614174001",
        "title": "テストを実行する",
        "description": "E2Eテストを実行する",
        "status": "IN_PROGRESS",
        "priority": "MEDIUM",
        "dueDate": null,
        "createdAt": "2023-09-16T10:30:00.000Z",
        "updatedAt": "2023-09-16T11:45:30.500Z"
      }
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

#### ステータスコード

- `200 OK`: リクエスト成功

### タスク詳細の取得

指定したIDのタスク詳細を取得します。

```
GET /api/tasks/:id
```

#### パラメータ

| パラメータ | 型     | 必須 | 説明         |
| ---------- | ------ | ---- | ------------ |
| `id`       | string | はい | タスクのUUID |

#### レスポンス例

```json
{
  "status": "success",
  "data": {
    "task": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "ドキュメントを作成する",
      "description": "APIドキュメントを作成する",
      "status": "TODO",
      "priority": "HIGH",
      "dueDate": "2023-09-30T23:59:59.999Z",
      "createdAt": "2023-09-16T12:34:56.789Z",
      "updatedAt": "2023-09-16T12:34:56.789Z"
    }
  }
}
```

#### ステータスコード

- `200 OK`: リクエスト成功
- `404 Not Found`: 指定されたIDのタスクが見つからない

### タスクの作成

新しいタスクを作成します。

```
POST /api/tasks
```

#### リクエストボディ

```json
{
  "title": "新しいタスク",
  "description": "これは新しいタスクの説明です",
  "priority": "MEDIUM",
  "dueDate": "2023-10-15T23:59:59.999Z"
}
```

| フィールド    | 型     | 必須   | 説明                                                             |
| ------------- | ------ | ------ | ---------------------------------------------------------------- |
| `title`       | string | はい   | タスクのタイトル                                                 |
| `description` | string | いいえ | タスクの説明                                                     |
| `priority`    | string | いいえ | タスクの優先度（`LOW`, `MEDIUM`, `HIGH`）、デフォルトは `MEDIUM` |
| `dueDate`     | string | いいえ | タスクの期限日（ISO 8601形式の日時）                             |

#### レスポンス例

```json
{
  "status": "success",
  "data": {
    "task": {
      "id": "323e4567-e89b-12d3-a456-426614174002",
      "title": "新しいタスク",
      "description": "これは新しいタスクの説明です",
      "status": "TODO",
      "priority": "MEDIUM",
      "dueDate": "2023-10-15T23:59:59.999Z",
      "createdAt": "2023-09-16T15:00:00.000Z",
      "updatedAt": "2023-09-16T15:00:00.000Z"
    }
  },
  "message": "タスクが正常に作成されました"
}
```

#### ステータスコード

- `201 Created`: タスクが正常に作成された
- `400 Bad Request`: 不正なリクエストデータ

### タスクの更新

指定したIDのタスク情報を更新します。

```
PUT /api/tasks/:id
```

#### パラメータ

| パラメータ | 型     | 必須 | 説明         |
| ---------- | ------ | ---- | ------------ |
| `id`       | string | はい | タスクのUUID |

#### リクエストボディ

```json
{
  "title": "更新されたタスク",
  "description": "これは更新されたタスクの説明です",
  "priority": "HIGH",
  "dueDate": "2023-10-20T23:59:59.999Z"
}
```

| フィールド    | 型     | 必須   | 説明                                      |
| ------------- | ------ | ------ | ----------------------------------------- |
| `title`       | string | いいえ | タスクのタイトル                          |
| `description` | string | いいえ | タスクの説明                              |
| `priority`    | string | いいえ | タスクの優先度（`LOW`, `MEDIUM`, `HIGH`） |
| `dueDate`     | string | いいえ | タスクの期限日（ISO 8601形式の日時）      |

#### レスポンス例

```json
{
  "status": "success",
  "data": {
    "task": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "更新されたタスク",
      "description": "これは更新されたタスクの説明です",
      "status": "TODO",
      "priority": "HIGH",
      "dueDate": "2023-10-20T23:59:59.999Z",
      "createdAt": "2023-09-16T12:34:56.789Z",
      "updatedAt": "2023-09-16T16:30:00.000Z"
    }
  },
  "message": "タスクが正常に更新されました"
}
```

#### ステータスコード

- `200 OK`: タスクが正常に更新された
- `400 Bad Request`: 不正なリクエストデータ
- `404 Not Found`: 指定されたIDのタスクが見つからない

### タスクステータスの更新

指定したIDのタスクステータスを更新します。

```
PATCH /api/tasks/:id/status
```

#### パラメータ

| パラメータ | 型     | 必須 | 説明         |
| ---------- | ------ | ---- | ------------ |
| `id`       | string | はい | タスクのUUID |

#### リクエストボディ

```json
{
  "status": "IN_PROGRESS"
}
```

| フィールド | 型     | 必須 | 説明                                                      |
| ---------- | ------ | ---- | --------------------------------------------------------- |
| `status`   | string | はい | タスクの新しいステータス（`TODO`, `IN_PROGRESS`, `DONE`） |

#### レスポンス例

```json
{
  "status": "success",
  "data": {
    "task": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "ドキュメントを作成する",
      "description": "APIドキュメントを作成する",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "dueDate": "2023-09-30T23:59:59.999Z",
      "createdAt": "2023-09-16T12:34:56.789Z",
      "updatedAt": "2023-09-16T17:15:00.000Z"
    }
  },
  "message": "タスクステータスが正常に更新されました"
}
```

#### ステータスコード

- `200 OK`: タスクステータスが正常に更新された
- `400 Bad Request`: 不正なリクエストデータ
- `404 Not Found`: 指定されたIDのタスクが見つからない

### タスクの削除

指定したIDのタスクを削除します。

```
DELETE /api/tasks/:id
```

#### パラメータ

| パラメータ | 型     | 必須 | 説明         |
| ---------- | ------ | ---- | ------------ |
| `id`       | string | はい | タスクのUUID |

#### レスポンス

レスポンスボディはありません。

#### ステータスコード

- `204 No Content`: タスクが正常に削除された
- `404 Not Found`: 指定されたIDのタスクが見つからない

---

## 統計情報

### タスク統計情報の取得

タスクに関する統計情報を取得します。

```
GET /api/statistics
```

#### レスポンス例

```json
{
  "totalTasks": 42,
  "byStatus": {
    "todo": 15,
    "inProgress": 20,
    "done": 7
  },
  "byPriority": {
    "low": 10,
    "medium": 25,
    "high": 7
  },
  "today": {
    "created": 5,
    "completed": 2
  },
  "lastUpdated": "2023-09-16T18:00:00.000Z"
}
```

| フィールド            | 型     | 説明                                   |
| --------------------- | ------ | -------------------------------------- |
| `totalTasks`          | number | タスク総数                             |
| `byStatus`            | object | ステータス別タスク数                   |
| `byStatus.todo`       | number | 未着手（TODO）のタスク数               |
| `byStatus.inProgress` | number | 進行中（IN_PROGRESS）のタスク数        |
| `byStatus.done`       | number | 完了（DONE）のタスク数                 |
| `byPriority`          | object | 優先度別タスク数                       |
| `byPriority.low`      | number | 低優先度（LOW）のタスク数              |
| `byPriority.medium`   | number | 中優先度（MEDIUM）のタスク数           |
| `byPriority.high`     | number | 高優先度（HIGH）のタスク数             |
| `today`               | object | 今日の活動に関する統計                 |
| `today.created`       | number | 今日作成されたタスク数                 |
| `today.completed`     | number | 今日完了したタスク数                   |
| `lastUpdated`         | string | 統計情報の最終更新日時（ISO 8601形式） |

#### ステータスコード

- `200 OK`: リクエスト成功
- `404 Not Found`: 統計情報が見つからない

### 統計情報のリセット（開発用）

タスク統計情報をリセットします。現在のタスクデータベースの状態に基づいて統計情報を再計算します。

```
POST /api/statistics/reset
```

#### レスポンス例

```json
{
  "status": "success",
  "message": "統計情報をリセットしました",
  "data": {
    "totalTasks": 42,
    "todoTasks": 15,
    "inProgressTasks": 20,
    "doneTasks": 7
  }
}
```

#### ステータスコード

- `200 OK`: 統計情報が正常にリセットされた

# Node.js タスク管理システム イベントスキーマドキュメント

このドキュメントは、Node.js Pub/Subプロジェクトで使用されるイベントスキーマとトピックについて説明します。

## 概要

このシステムでは、Google Cloud Pub/Subを使用したイベント駆動型アーキテクチャを採用しています。タスクのライフサイクルイベント（作成、更新、削除、ステータス変更）は対応するPub/Subトピックに発行され、複数のサブスクライバーがこれらのイベントを非同期に処理します。

## トピック一覧

システムで使用されるPub/Subトピックは以下の通りです：

| トピック名            | 説明                                       |
| --------------------- | ------------------------------------------ |
| `task-created`        | タスク作成時に発行されるイベント           |
| `task-updated`        | タスク更新時に発行されるイベント           |
| `task-deleted`        | タスク削除時に発行されるイベント           |
| `task-status-changed` | タスクステータス変更時に発行されるイベント |

## サブスクリプション一覧

システムに実装されているサブスクリプションは以下の通りです：

| サブスクリプション名 | 説明                                               |
| -------------------- | -------------------------------------------------- |
| `task-notification`  | タスクのライフサイクルイベントに基づいて通知を生成 |
| `task-statistics`    | タスクイベントに基づいて統計情報を更新             |

## イベントスキーマ

### 共通構造

すべてのタスクイベントは以下の共通構造を持ちます：

```typescript
interface TaskEvent {
  eventType: TaskEventType; // イベントの種類
  taskId: string; // タスクのUUID
  task: Task; // タスクの完全なデータ
  timestamp: string; // イベント発生時刻（ISO 8601形式）
  metadata?: Record<string, any>; // イベント固有のメタデータ
}
```

### イベントタイプ

システムで使用されるイベントタイプは以下の通りです：

```typescript
enum TaskEventType {
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_DELETED = 'TASK_DELETED',
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
}
```

### イベント詳細

#### タスク作成イベント (TASK_CREATED)

このイベントは新しいタスクが作成された時に発行されます。

**トピック:** `task-created`

**スキーマ:**

```typescript
interface TaskCreatedEvent extends TaskEvent {
  eventType: TaskEventType.TASK_CREATED;
}
```

**例:**

```json
{
  "eventType": "TASK_CREATED",
  "taskId": "123e4567-e89b-12d3-a456-426614174000",
  "task": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "ドキュメントを作成する",
    "description": "APIドキュメントを作成する",
    "status": "TODO",
    "priority": "HIGH",
    "dueDate": "2023-09-30T23:59:59.999Z",
    "createdAt": "2023-09-16T12:34:56.789Z",
    "updatedAt": "2023-09-16T12:34:56.789Z"
  },
  "timestamp": "2023-09-16T12:34:56.789Z"
}
```

#### タスク更新イベント (TASK_UPDATED)

このイベントはタスクが更新された時に発行されます。

**トピック:** `task-updated`

**スキーマ:**

```typescript
interface TaskUpdatedEvent extends TaskEvent {
  eventType: TaskEventType.TASK_UPDATED;
  metadata?: {
    previousTask?: Partial<Task>;
  };
}
```

**例:**

```json
{
  "eventType": "TASK_UPDATED",
  "taskId": "123e4567-e89b-12d3-a456-426614174000",
  "task": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "更新されたタスク",
    "description": "これは更新されたタスクの説明です",
    "status": "TODO",
    "priority": "HIGH",
    "dueDate": "2023-10-20T23:59:59.999Z",
    "createdAt": "2023-09-16T12:34:56.789Z",
    "updatedAt": "2023-09-16T15:30:00.000Z"
  },
  "timestamp": "2023-09-16T15:30:00.000Z",
  "metadata": {
    "previousTask": {
      "title": "元のタスク",
      "description": "これは元のタスクの説明です",
      "priority": "MEDIUM"
    }
  }
}
```

#### タスク削除イベント (TASK_DELETED)

このイベントはタスクが削除された時に発行されます。

**トピック:** `task-deleted`

**スキーマ:**

```typescript
interface TaskDeletedEvent extends TaskEvent {
  eventType: TaskEventType.TASK_DELETED;
}
```

**例:**

```json
{
  "eventType": "TASK_DELETED",
  "taskId": "123e4567-e89b-12d3-a456-426614174000",
  "task": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "削除されたタスク",
    "description": "これは削除されるタスクの説明です",
    "status": "TODO",
    "priority": "MEDIUM",
    "dueDate": null,
    "createdAt": "2023-09-16T12:34:56.789Z",
    "updatedAt": "2023-09-16T12:34:56.789Z"
  },
  "timestamp": "2023-09-16T16:45:00.000Z"
}
```

#### タスクステータス変更イベント (TASK_STATUS_CHANGED)

このイベントはタスクのステータスが変更された時に発行されます。

**トピック:** `task-status-changed`

**スキーマ:**

```typescript
interface TaskStatusChangedEvent extends TaskEvent {
  eventType: TaskEventType.TASK_STATUS_CHANGED;
  metadata: {
    previousStatus: string;
  };
}
```

**例:**

```json
{
  "eventType": "TASK_STATUS_CHANGED",
  "taskId": "123e4567-e89b-12d3-a456-426614174000",
  "task": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "ドキュメントを作成する",
    "description": "APIドキュメントを作成する",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "dueDate": "2023-09-30T23:59:59.999Z",
    "createdAt": "2023-09-16T12:34:56.789Z",
    "updatedAt": "2023-09-16T17:00:00.000Z"
  },
  "timestamp": "2023-09-16T17:00:00.000Z",
  "metadata": {
    "previousStatus": "TODO"
  }
}
```

## サブスクライバー処理の概要

### 通知サブスクライバー

通知サブスクライバー (`task-notification`) は、タスクのライフサイクルイベントを監視し、イベントタイプに応じた通知または追加処理を行います。

主な機能：

- タスク作成時のウェルカム通知
- タスク更新時の変更通知
- タスク削除時の削除確認
- タスクステータス変更時の進捗通知（特に完了時）

このサブスクライバーは以下のトピックをサブスクライブします：

- `task-created`
- `task-updated`
- `task-deleted`
- `task-status-changed`

### 統計情報サブスクライバー

統計情報サブスクライバー (`task-statistics`) は、タスクイベントに基づいて統計情報を更新します。

主な機能：

- タスク総数の追跡
- ステータス別タスク数の維持
- 優先度別タスク数の維持
- 日次作成・完了タスク数の追跡

このサブスクライバーは以下のトピックをサブスクライブします：

- `task-created`
- `task-updated`
- `task-deleted`
- `task-status-changed`

## イベント信頼性と配信保証

- 少なくとも1回の配信保証：各イベントは少なくとも1回はサブスクライバーに配信されます
- 冪等性：サブスクライバーは同一イベントの重複処理に対応できるよう設計されています
- 順序保証：同一タスクに関するイベントについては、基本的には発生順に処理されますが、厳密な順序保証はないため、サブスクライバー側で順序の妥当性を確認する必要があります

## ローカル開発時の注意点

ローカル環境ではGoogle Cloud Pub/Subエミュレータを使用しています。以下の点に注意してください：

- エミュレータはデータを永続化しないため、再起動するとトピックやサブスクリプションは失われます
- アプリケーション起動時にトピックとサブスクリプションが自動的に作成されます
- 開発環境では特殊なサブスクリプションID (`dev-subscription-<トピック名>`) が使用されます

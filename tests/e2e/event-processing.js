import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import exec from 'k6/execution';

// テスト設定
export const options = {
  scenarios: {
    // 基本的なイベント処理テスト
    event_test: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '1m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%のリクエストが500ms以下であること
  },
};

export default function () {
  const baseUrl = 'http://localhost:3000';
  let taskId;
  let initialStats;

  group('統計情報の初期状態を取得', () => {
    // 現時点のAPIが実装されていないため、コメントアウト
    /* */
    const response = http.get(`${baseUrl}/api/statistics`);
    check(response, {
      ステータスコードは200: r => r.status === 200,
      統計情報が取得できる: r => r.json('totalTasks') !== undefined,
    });

    if (response.status === 200) {
      initialStats = response.json();
      console.log(`初期統計: 合計タスク数=${initialStats.totalTasks}`);
    }
    /* */
  });

  group('タスク作成とイベント処理', () => {
    // 現時点のAPIが実装されていないため、コメントアウト
    /* */
    // 1. タスクを作成
    const createPayload = JSON.stringify({
      title: `イベントテスト ${randomString(8)}`,
      description: 'イベント処理テスト用タスク',
      priority: 'HIGH',
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const createResponse = http.post(`${baseUrl}/api/tasks`, createPayload, params);

    check(createResponse, {
      'タスク作成: ステータスコードは201': r => r.status === 201,
      タスクが作成された: r => r.json('id') !== undefined,
    });

    if (createResponse.status === 201) {
      taskId = createResponse.json('id');
    }

    // 2. イベント処理に時間を与える
    sleep(2);

    // 3. 統計情報が更新されたことを確認
    const statsResponse = http.get(`${baseUrl}/api/statistics`);

    check(statsResponse, {
      ステータスコードは200: r => r.status === 200,
      合計タスク数が増加している: r => {
        const stats = statsResponse.json();
        return stats.totalTasks > initialStats.totalTasks;
      },
      HIGH優先度のタスク数が増加している: r => {
        const stats = statsResponse.json();
        return stats.highPriority > initialStats.highPriority;
      },
    });
    /* */
  });

  group('タスクステータス変更とイベント処理', () => {
    // 現時点のAPIが実装されていないため、コメントアウト
    /* */
    if (taskId) {
      // 1. タスクのステータスを変更
      const statusPayload = JSON.stringify({
        status: 'DONE',
      });

      const params = {
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const statusResponse = http.patch(
        `${baseUrl}/api/tasks/${taskId}/status`,
        statusPayload,
        params,
      );

      check(statusResponse, {
        ステータスコード200: r => r.status === 200,
        ステータスが更新された: r => r.json('status') === 'DONE',
      });

      // 2. イベント処理に時間を与える
      sleep(2);

      // 3. 統計情報の更新を確認
      const statsResponse = http.get(`${baseUrl}/api/statistics`);

      check(statsResponse, {
        ステータスコードは200: r => r.status === 200,
        完了タスク数が増加している: r => {
          const stats = statsResponse.json();
          return stats.doneTasks > initialStats.doneTasks;
        },
      });
    }
    /* */
  });

  group('タスク削除とイベント処理', () => {
    // 現時点のAPIが実装されていないため、コメントアウト
    /* */
    if (taskId) {
      // 1. タスクを削除
      const deleteResponse = http.del(`${baseUrl}/api/tasks/${taskId}`);

      check(deleteResponse, {
        ステータスコードは204: r => r.status === 204,
      });

      // 2. イベント処理に時間を与える
      sleep(2);

      // 3. 統計情報の更新を確認
      const statsResponse = http.get(`${baseUrl}/api/statistics`);

      check(statsResponse, {
        ステータスコードは200: r => r.status === 200,
        合計タスク数が減少している: r => {
          const newStats = statsResponse.json();
          const afterDeleteCount = newStats.totalTasks;
          return afterDeleteCount < initialStats.totalTasks + 1; // 作成して削除したので初期値±0または初期値+1→初期値の可能性
        },
      });
    }
    /* */
  });

  // 通知サブスクライバーの処理はログで確認する必要があるため、
  // 実際のAPIテスト実行時にサーバーログを監視する
}

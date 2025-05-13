import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// テスト設定
export const options = {
  // scenariosを使用する場合は、ルートレベルのvusとiterationsを削除
  scenarios: {
    // 基本的なAPIテスト
    api_test: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '1m',
    },
    // スケーリングテスト（必要に応じて）
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 5 }, // 5秒間で0から5ユーザーに増加
        { duration: '20s', target: 5 }, // 5ユーザーを20秒間維持
        { duration: '5s', target: 0 }, // 5秒間で0ユーザーに減少
      ],
      gracefulStop: '5s',
      startTime: '10s', // api_testシナリオの後に実行
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%のリクエストが500ms以下であること
    'http_req_duration{name:create}': ['p(95)<300'], // タスク作成は300ms以下
    'http_req_duration{name:list}': ['p(95)<200'], // タスク一覧は200ms以下
  },
};

// テスト実行時に表示する名前
export default function () {
  const baseUrl = 'http://localhost:3000';
  let taskId;

  group('ヘルスチェック', () => {
    const response = http.get(`${baseUrl}/api/health`);
    console.log(`ヘルスチェックレスポンス: ${JSON.stringify(response.json())}`);

    check(response, {
      ステータスコードは200: r => r.status === 200,
      レスポンスはJSONである: r => r.headers['Content-Type'].includes('application/json'),
      ステータスはOK: r => r.json('status') === 'success',
    });
  });

  group('データベース接続テスト', () => {
    const response = http.get(`${baseUrl}/db-test`);
    console.log(`データベース接続テストレスポンス: ${JSON.stringify(response.json())}`);

    check(response, {
      ステータスコードは200: r => r.status === 200,
      データベース接続成功: r => r.json('status') === 'Database connection successful',
    });
  });

  // これ以降は実際のAPIが実装された後に有効化する
  /* */
  group('タスク作成', () => {
    const payload = JSON.stringify({
      title: `テストタスク ${randomString(8)}`,
      description: 'k6によるE2Eテスト用タスク',
      priority: 'MEDIUM',
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: { name: 'create' },
    };

    const response = http.post(`${baseUrl}/api/tasks`, payload, params);
    console.log(`タスク作成レスポンス: ${JSON.stringify(response.json())}`);

    check(response, {
      ステータスコードは201: r => r.status === 201,
      タスクが作成された: r => r.json('data').task.id !== undefined,
      タイトルが正しい: r => r.json('data').task.title.includes('テストタスク'),
    });

    // 作成されたタスクIDを保存
    if (response.status === 201) {
      taskId = response.json('data').task.id;
      console.log(`作成されたタスクID: ${taskId}`);
    }
  });

  group('タスク一覧取得', () => {
    const response = http.get(`${baseUrl}/api/tasks`, { tags: { name: 'list' } });
    console.log(`タスク一覧レスポンス: ${JSON.stringify(response.json())}`);

    check(response, {
      ステータスコードは200: r => r.status === 200,
      タスクが配列で返却される: r => Array.isArray(r.json('data').tasks),
      タスクが1つ以上ある: r => r.json('data').tasks.length > 0,
    });
  });

  group('タスク詳細取得', () => {
    if (taskId) {
      const response = http.get(`${baseUrl}/api/tasks/${taskId}`);
      console.log(`タスク詳細レスポンス: ${JSON.stringify(response.json())}`);

      check(response, {
        ステータスコードは200: r => r.status === 200,
        タスクIDが一致する: r => r.json('data').task.id === taskId,
      });
    }
  });

  group('タスク更新', () => {
    if (taskId) {
      const payload = JSON.stringify({
        title: `更新されたタスク ${randomString(5)}`,
        description: '更新されたタスク説明',
        priority: 'HIGH',
      });

      const params = {
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const response = http.put(`${baseUrl}/api/tasks/${taskId}`, payload, params);
      console.log(`タスク更新レスポンス: ${JSON.stringify(response.json())}`);

      check(response, {
        ステータスコードは200: r => r.status === 200,
        タスクが更新された: r => r.json('data').task.id === taskId,
        タイトルが更新された: r => r.json('data').task.title.includes('更新されたタスク'),
        優先度が更新された: r => r.json('data').task.priority === 'HIGH',
      });
    }
  });

  group('タスクステータス変更', () => {
    if (taskId) {
      const payload = JSON.stringify({
        status: 'IN_PROGRESS',
      });

      const params = {
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const response = http.patch(`${baseUrl}/api/tasks/${taskId}/status`, payload, params);
      console.log(`タスクステータス変更レスポンス: ${JSON.stringify(response.json())}`);

      check(response, {
        ステータスコードは200: r => r.status === 200,
        タスクステータスが更新された: r => r.json('data').task.status === 'IN_PROGRESS',
      });
    }
  });

  group('タスク削除', () => {
    if (taskId) {
      const response = http.del(`${baseUrl}/api/tasks/${taskId}`);

      check(response, {
        ステータスコードは204: r => r.status === 204,
      });

      // 削除後のタスク取得で404が返ることを確認
      const getResponse = http.get(`${baseUrl}/api/tasks/${taskId}`);
      console.log(`削除後のタスク取得レスポンス: ${JSON.stringify(getResponse.json())}`);

      check(getResponse, {
        削除後のタスク取得で404が返る: r => r.status === 404,
      });
    }
  });
  /* */

  // リクエスト間の待機時間
  sleep(1);
}

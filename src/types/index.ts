// タスク関連の型とenum
export * from './task';

// 統計情報関連の型
export * from './statistics';

// イベント関連の型とenum
export * from './events';

// APIレスポンスの標準形式
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  error?: {
    code?: string;
    details?: any;
  };
}

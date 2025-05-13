import { Router } from 'express';
import taskRoutes from './taskRoutes';
import statisticsRoutes from './statisticsRoutes';

const router = Router();

// ヘルスチェックルート（APIルート内）
router.get('/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// タスクルーターをマウント
router.use('/tasks', taskRoutes);

// 統計情報ルーターをマウント
router.use('/statistics', statisticsRoutes);

export default router;

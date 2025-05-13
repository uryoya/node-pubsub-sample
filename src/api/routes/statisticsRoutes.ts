import { Router } from 'express';
import * as statisticsController from '../controllers/statisticsController';

const router = Router();

/**
 * @route   GET /api/statistics
 * @desc    タスク統計情報を取得
 * @access  Public
 */
router.get('/', statisticsController.getTaskStatistics);

/**
 * @route   POST /api/statistics/reset
 * @desc    タスク統計情報をリセット (開発用)
 * @access  Public
 */
router.post('/reset', statisticsController.resetTaskStatistics);

export default router;

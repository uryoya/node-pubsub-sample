import { Router } from 'express';
import * as taskController from '../controllers/taskController';
import {
  validateCreateTask,
  validateUpdateTask,
  validateUpdateTaskStatus,
  validateTaskId,
  validateGetTasks,
  validateRequest,
} from '../validation';

const router = Router();

/**
 * @route   GET /api/tasks
 * @desc    タスク一覧を取得
 * @access  Public
 */
router.get('/', validateGetTasks, validateRequest, taskController.getTasks);

/**
 * @route   POST /api/tasks
 * @desc    新しいタスクを作成
 * @access  Public
 */
router.post('/', validateCreateTask, validateRequest, taskController.createTask);

/**
 * @route   GET /api/tasks/:id
 * @desc    指定したIDのタスクを取得
 * @access  Public
 */
router.get('/:id', validateTaskId, validateRequest, taskController.getTaskById);

/**
 * @route   PUT /api/tasks/:id
 * @desc    指定したIDのタスクを更新
 * @access  Public
 */
router.put('/:id', validateUpdateTask, validateRequest, taskController.updateTask);

/**
 * @route   PATCH /api/tasks/:id/status
 * @desc    指定したIDのタスクステータスを更新
 * @access  Public
 */
router.patch(
  '/:id/status',
  validateUpdateTaskStatus,
  validateRequest,
  taskController.updateTaskStatus,
);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    指定したIDのタスクを削除
 * @access  Public
 */
router.delete('/:id', validateTaskId, validateRequest, taskController.deleteTask);

export default router;

/**
 * Task Routes
 *
 * POST   /api/tasks           — Create task (admin, manager)
 * GET    /api/tasks           — List tasks (filtered, sorted, paginated)
 * GET    /api/tasks/:id       — Get task by ID
 * PATCH  /api/tasks/:id       — Update task
 * DELETE /api/tasks/:id       — Soft delete task (admin)
 * GET    /api/tasks/:id/audit — Get audit history (admin, manager)
 */

const router = require('express').Router();
const taskController = require('../controllers/task.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createTaskSchema,
  updateTaskSchema,
  taskQuerySchema,
  taskIdParamSchema,
} = require('../validators/task.validator');

// All task routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task management with audit trail
 */

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Create a new task (admin, manager)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, projectId]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Implement login page
 *               description:
 *                 type: string
 *                 example: Build the login UI with email/password fields
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 default: medium
 *               status:
 *                 type: string
 *                 enum: [todo, in_progress, in_review, done]
 *                 default: todo
 *               assigneeId:
 *                 type: string
 *                 format: uuid
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               dueDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-07-01"
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not authorized
 */
router.post('/', authorize('admin', 'manager'), validate(createTaskSchema), taskController.createTask);

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: List tasks with filtering, sorting, and pagination
 *     description: Members only see tasks assigned to them. Admins and managers see all tasks.
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [todo, in_progress, in_review, done]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *       - in: query
 *         name: assigneeId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, dueDate, priority, status, title]
 *           default: createdAt
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
 */
router.get('/', validate(taskQuerySchema, 'query'), taskController.listTasks);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Get task by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Task retrieved successfully
 *       403:
 *         description: Members can only view assigned tasks
 *       404:
 *         description: Task not found
 */
router.get('/:id', validate(taskIdParamSchema, 'params'), taskController.getTask);

/**
 * @swagger
 * /api/tasks/{id}:
 *   patch:
 *     tags: [Tasks]
 *     summary: Update task (status changes are logged in audit trail)
 *     description: Members can only update status on tasks assigned to them. Admins and managers can update any field.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *               status:
 *                 type: string
 *                 enum: [todo, in_progress, in_review, done]
 *               assigneeId:
 *                 type: string
 *                 format: uuid
 *               dueDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Task not found
 */
router.patch('/:id', validate(taskIdParamSchema, 'params'), validate(updateTaskSchema), taskController.updateTask);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Soft delete task (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       403:
 *         description: Not authorized (admin only)
 *       404:
 *         description: Task not found
 */
router.delete('/:id', authorize('admin'), validate(taskIdParamSchema, 'params'), taskController.deleteTask);

/**
 * @swagger
 * /api/tasks/{id}/audit:
 *   get:
 *     tags: [Tasks]
 *     summary: Get audit trail for a task (admin, manager)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Audit history retrieved successfully
 *       403:
 *         description: Not authorized (admin/manager only)
 *       404:
 *         description: Task not found
 */
router.get('/:id/audit', authorize('admin', 'manager'), validate(taskIdParamSchema, 'params'), taskController.getTaskAudit);

module.exports = router;

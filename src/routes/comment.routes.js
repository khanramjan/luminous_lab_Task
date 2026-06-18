/**
 * Comment Routes
 *
 * Nested under /api/tasks/:taskId/comments
 *
 * POST   /                 — Add comment to task
 * GET    /                 — List comments for task
 * PATCH  /:commentId       — Edit comment (author or admin)
 * DELETE /:commentId       — Soft delete comment (author or admin)
 */

const router = require('express').Router({ mergeParams: true }); // Inherit :taskId param
const commentController = require('../controllers/comment.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createCommentSchema,
  updateCommentSchema,
  commentParamsSchema,
} = require('../validators/comment.validator');

// All comment routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Task comments with activity logging
 */

/**
 * @swagger
 * /api/tasks/{taskId}/comments:
 *   post:
 *     tags: [Comments]
 *     summary: Add a comment to a task
 *     parameters:
 *       - in: path
 *         name: taskId
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
 *             required: [body]
 *             properties:
 *               body:
 *                 type: string
 *                 example: Working on this task now
 *     responses:
 *       201:
 *         description: Comment added successfully
 *       404:
 *         description: Task not found
 */
router.post('/', validate(commentParamsSchema, 'params'), validate(createCommentSchema), commentController.createComment);

/**
 * @swagger
 * /api/tasks/{taskId}/comments:
 *   get:
 *     tags: [Comments]
 *     summary: List comments for a task
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Comments retrieved successfully
 *       404:
 *         description: Task not found
 */
router.get('/', validate(commentParamsSchema, 'params'), commentController.listComments);

/**
 * @swagger
 * /api/tasks/{taskId}/comments/{commentId}:
 *   patch:
 *     tags: [Comments]
 *     summary: Edit a comment (author or admin)
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: commentId
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
 *             required: [body]
 *             properties:
 *               body:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Comment not found
 */
router.patch('/:commentId', validate(commentParamsSchema, 'params'), validate(updateCommentSchema), commentController.updateComment);

/**
 * @swagger
 * /api/tasks/{taskId}/comments/{commentId}:
 *   delete:
 *     tags: [Comments]
 *     summary: Soft delete a comment (author or admin)
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Comment not found
 */
router.delete('/:commentId', validate(commentParamsSchema, 'params'), commentController.deleteComment);

module.exports = router;

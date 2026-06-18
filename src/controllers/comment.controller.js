/**
 * Comment Controller
 *
 * CRUD operations for task comments with activity logging.
 * All authenticated users can add comments to accessible tasks.
 * Only comment authors and admins can edit/delete comments.
 */

const { Comment, User, Task } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const auditService = require('../services/audit.service');

/**
 * POST /api/tasks/:taskId/comments
 * Add a comment to a task.
 */
const createComment = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { body } = req.body;

    // Verify task exists
    const task = await Task.findByPk(taskId);
    if (!task) {
      throw ApiError.notFound('Task');
    }

    // Members can only comment on tasks assigned to them
    if (req.user.role === 'member' && task.assigneeId !== req.user.id) {
      throw ApiError.forbidden('You can only comment on tasks assigned to you');
    }

    const comment = await Comment.create({
      body,
      taskId,
      authorId: req.user.id,
    });

    // Log comment activity in audit trail
    await auditService.logChange({
      taskId,
      action: 'COMMENT_ADDED',
      field: 'comment',
      oldValue: null,
      newValue: body.substring(0, 200), // Truncate for audit log
      changedById: req.user.id,
    });

    // Reload with author
    const result = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email'] }],
    });

    return ApiResponse.created(res, result, 'Comment added successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tasks/:taskId/comments
 * List comments for a task with pagination.
 */
const listComments = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { page, limit, offset } = parsePagination(req.query);

    // Verify task exists
    const task = await Task.findByPk(taskId);
    if (!task) {
      throw ApiError.notFound('Task');
    }

    // Members can only view comments on tasks assigned to them
    if (req.user.role === 'member' && task.assigneeId !== req.user.id) {
      throw ApiError.forbidden('You can only view comments on tasks assigned to you');
    }

    const { count, rows } = await Comment.findAndCountAll({
      where: { taskId },
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email'] }],
      limit,
      offset,
      order: [['createdAt', 'ASC']],
    });

    const pagination = buildPaginationMeta(count, page, limit);

    return ApiResponse.paginated(res, rows, pagination, 'Comments retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/tasks/:taskId/comments/:commentId
 * Edit a comment (author or admin only).
 */
const updateComment = async (req, res, next) => {
  try {
    const { taskId, commentId } = req.params;
    const { body } = req.body;

    const comment = await Comment.findOne({
      where: { id: commentId, taskId },
    });

    if (!comment) {
      throw ApiError.notFound('Comment');
    }

    // Only author or admin can edit
    if (req.user.role !== 'admin' && comment.authorId !== req.user.id) {
      throw ApiError.forbidden('You can only edit your own comments');
    }

    const oldBody = comment.body;
    await comment.update({ body });

    // Log comment update in audit trail
    await auditService.logChange({
      taskId,
      action: 'COMMENT_UPDATED',
      field: 'comment',
      oldValue: oldBody.substring(0, 200),
      newValue: body.substring(0, 200),
      changedById: req.user.id,
    });

    const result = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email'] }],
    });

    return ApiResponse.success(res, result, 'Comment updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/tasks/:taskId/comments/:commentId
 * Soft delete a comment (author or admin only).
 */
const deleteComment = async (req, res, next) => {
  try {
    const { taskId, commentId } = req.params;

    const comment = await Comment.findOne({
      where: { id: commentId, taskId },
    });

    if (!comment) {
      throw ApiError.notFound('Comment');
    }

    // Only author or admin can delete
    if (req.user.role !== 'admin' && comment.authorId !== req.user.id) {
      throw ApiError.forbidden('You can only delete your own comments');
    }

    // Log comment deletion in audit trail
    await auditService.logChange({
      taskId,
      action: 'COMMENT_DELETED',
      field: 'comment',
      oldValue: comment.body.substring(0, 200),
      newValue: null,
      changedById: req.user.id,
    });

    await comment.destroy(); // Soft delete

    return ApiResponse.success(res, null, 'Comment deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComment,
  listComments,
  updateComment,
  deleteComment,
};

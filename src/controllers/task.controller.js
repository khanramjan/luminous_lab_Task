/**
 * Task Controller
 *
 * CRUD operations for tasks with:
 * - Role-based access control (admin, manager, member)
 * - Filtering by status, priority, assignee, project
 * - Sorting and pagination
 * - Audit trail for status/priority/assignee changes
 *
 * Access rules:
 * - Admin: full access to all tasks
 * - Manager: can create, assign, and update any task
 * - Member: can only view and update tasks assigned to them
 */

const { Op } = require('sequelize');
const { Task, User, Project, AuditLog, sequelize } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const auditService = require('../services/audit.service');

/**
 * POST /api/tasks
 * Create a new task (admin, manager only).
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, priority, status, assigneeId, projectId, dueDate } = req.body;

    // Verify project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      throw ApiError.notFound('Project');
    }

    // Verify assignee exists (if provided)
    if (assigneeId) {
      const assignee = await User.findByPk(assigneeId);
      if (!assignee) {
        throw ApiError.notFound('Assignee user');
      }
    }

    const task = await Task.create({
      title,
      description,
      priority,
      status,
      assigneeId,
      projectId,
      dueDate,
    });

    // Log task creation in audit trail
    await auditService.logChange({
      taskId: task.id,
      action: 'TASK_CREATED',
      field: null,
      oldValue: null,
      newValue: task.title,
      changedById: req.user.id,
    });

    // Reload with associations
    const result = await Task.findByPk(task.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] },
      ],
    });

    return ApiResponse.created(res, result, 'Task created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tasks
 * List tasks with filtering, sorting, and pagination.
 * Members only see their assigned tasks.
 */
const listTasks = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { status, priority, assigneeId, projectId, sortBy, order, search } = req.query;

    // Build where clause
    const where = {};

    // Members can only see their assigned tasks
    if (req.user.role === 'member') {
      where.assigneeId = req.user.id;
    }

    // Filters
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;
    if (projectId) where.projectId = projectId;

    // Search in title and description (iLike for case-insensitive PostgreSQL, like for SQLite)
    if (search) {
      const likeOp = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
      where[Op.or] = [
        { title: { [likeOp]: `%${search}%` } },
        { description: { [likeOp]: `%${search}%` } },
      ];
    }

    // Sort
    const validSortFields = ['createdAt', 'updatedAt', 'dueDate', 'priority', 'status', 'title'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = ['asc', 'ASC'].includes(order) ? 'ASC' : 'DESC';

    const { count, rows } = await Task.findAndCountAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] },
      ],
      limit,
      offset,
      order: [[sortField, sortOrder]],
    });

    const pagination = buildPaginationMeta(count, page, limit);

    return ApiResponse.paginated(res, rows, pagination, 'Tasks retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tasks/:id
 * Get a single task by ID.
 * Members can only view their assigned tasks.
 */
const getTask = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] },
      ],
    });

    if (!task) {
      throw ApiError.notFound('Task');
    }

    // Members can only view their assigned tasks
    if (req.user.role === 'member' && task.assigneeId !== req.user.id) {
      throw ApiError.forbidden('You can only view tasks assigned to you');
    }

    return ApiResponse.success(res, task, 'Task retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/tasks/:id
 * Update a task. Members can only update tasks assigned to them.
 * Status, priority, and assignee changes are logged to audit trail.
 */
const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      throw ApiError.notFound('Task');
    }

    // Members can only update their assigned tasks
    if (req.user.role === 'member' && task.assigneeId !== req.user.id) {
      throw ApiError.forbidden('You can only update tasks assigned to you');
    }

    // Members can only update status (not reassign, change priority, etc.)
    if (req.user.role === 'member') {
      const allowedFields = ['status'];
      const requestedFields = Object.keys(req.body);
      const disallowed = requestedFields.filter((f) => !allowedFields.includes(f));
      if (disallowed.length > 0) {
        throw ApiError.forbidden(`Members can only update: ${allowedFields.join(', ')}. Cannot update: ${disallowed.join(', ')}`);
      }
    }

    // Track changes for audit trail
    const auditChanges = [];
    const trackedFields = {
      status: 'STATUS_CHANGE',
      priority: 'PRIORITY_CHANGE',
      assigneeId: 'ASSIGNEE_CHANGE',
    };

    for (const [field, action] of Object.entries(trackedFields)) {
      if (req.body[field] !== undefined && req.body[field] !== task[field]) {
        auditChanges.push({
          action,
          field,
          oldValue: task[field],
          newValue: req.body[field],
        });
      }
    }

    // Verify new assignee exists (if being changed)
    if (req.body.assigneeId) {
      const assignee = await User.findByPk(req.body.assigneeId);
      if (!assignee) {
        throw ApiError.notFound('Assignee user');
      }
    }

    // Update the task
    const updateData = {};
    const allowedUpdateFields = ['title', 'description', 'priority', 'status', 'assigneeId', 'dueDate'];
    for (const field of allowedUpdateFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    await task.update(updateData);

    // Log audit trail entries
    if (auditChanges.length > 0) {
      await auditService.logMultipleChanges(task.id, auditChanges, req.user.id);
    }

    // Reload with associations
    const result = await Task.findByPk(task.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] },
      ],
    });

    return ApiResponse.success(res, result, 'Task updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/tasks/:id
 * Soft delete a task (admin only).
 */
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      throw ApiError.notFound('Task');
    }

    // Log deletion in audit trail
    await auditService.logChange({
      taskId: task.id,
      action: 'TASK_DELETED',
      field: null,
      oldValue: task.title,
      newValue: null,
      changedById: req.user.id,
    });

    await task.destroy(); // Soft delete

    return ApiResponse.success(res, null, 'Task deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tasks/:id/audit
 * Get the full audit history for a task (admin, manager only).
 */
const getTaskAudit = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      throw ApiError.notFound('Task');
    }

    const auditHistory = await auditService.getTaskAuditHistory(task.id);

    return ApiResponse.success(res, auditHistory, 'Audit history retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTask,
  listTasks,
  getTask,
  updateTask,
  deleteTask,
  getTaskAudit,
};

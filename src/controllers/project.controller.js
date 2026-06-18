/**
 * Project Controller
 *
 * CRUD operations for projects.
 * - Admin & Manager can create/update projects.
 * - All authenticated users can list/view projects.
 * - Admin only can delete projects.
 */

const { Project, User } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * POST /api/projects
 * Create a new project.
 */
const createProject = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const project = await Project.create({
      name,
      description,
      ownerId: req.user.id,
    });

    // Reload with owner association
    const result = await Project.findByPk(project.id, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }],
    });

    return ApiResponse.created(res, result, 'Project created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/projects
 * List all projects with pagination.
 */
const listProjects = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const { count, rows } = await Project.findAndCountAll({
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    const pagination = buildPaginationMeta(count, page, limit);

    return ApiResponse.paginated(res, rows, pagination, 'Projects retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/projects/:id
 * Get a single project by ID.
 */
const getProject = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }],
    });

    if (!project) {
      throw ApiError.notFound('Project');
    }

    return ApiResponse.success(res, project, 'Project retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/projects/:id
 * Update a project (admin or owner/manager only).
 */
const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      throw ApiError.notFound('Project');
    }

    // Only admin or the project owner (who must be a manager/admin) can update
    if (req.user.role !== 'admin' && project.ownerId !== req.user.id) {
      throw ApiError.forbidden('Only the project owner or an admin can update this project');
    }

    const { name, description } = req.body;
    await project.update({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
    });

    const result = await Project.findByPk(project.id, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }],
    });

    return ApiResponse.success(res, result, 'Project updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/projects/:id
 * Soft delete a project (admin only).
 */
const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      throw ApiError.notFound('Project');
    }

    await project.destroy(); // Soft delete

    return ApiResponse.success(res, null, 'Project deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
};

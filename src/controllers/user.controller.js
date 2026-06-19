/**
 * User Controller
 *
 * Admin-only user management: list, get, update, soft delete.
 */

const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * GET /api/users/me
 * Get the currently authenticated user's profile.
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'refreshToken'] },
    });

    if (!user) {
      throw ApiError.notFound('User');
    }

    return ApiResponse.success(res, user.toSafeJSON(), 'Profile retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users
 * List all users with pagination (admin only).
 */
const listUsers = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const { count, rows } = await User.findAndCountAll({
      attributes: { exclude: ['password', 'refreshToken'] },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    const users = rows.map((u) => u.toSafeJSON());
    const pagination = buildPaginationMeta(count, page, limit);

    return ApiResponse.paginated(res, users, pagination, 'Users retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:id
 * Get a single user by ID (admin only).
 */
const getUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'refreshToken'] },
    });

    if (!user) {
      throw ApiError.notFound('User');
    }

    return ApiResponse.success(res, user.toSafeJSON(), 'User retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/:id
 * Update a user's name or role (admin only).
 */
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      throw ApiError.notFound('User');
    }

    const { name, role } = req.body;
    await user.update({ ...(name && { name }), ...(role && { role }) });

    return ApiResponse.success(res, user.toSafeJSON(), 'User updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/:id
 * Soft delete a user (admin only).
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      throw ApiError.notFound('User');
    }

    // Prevent admin from deleting themselves
    if (user.id === req.user.id) {
      throw ApiError.badRequest('Cannot delete your own account');
    }

    await user.destroy(); // Soft delete (paranoid)

    return ApiResponse.success(res, null, 'User deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMe,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
};

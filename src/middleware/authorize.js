/**
 * Authorization Middleware (Role-Based Access Control)
 *
 * Factory function that returns middleware checking if the
 * authenticated user's role is in the allowed roles list.
 *
 * Usage:
 *   router.post('/tasks', authenticate, authorize('admin', 'manager'), createTask);
 */

const ApiError = require('../utils/ApiError');

/**
 * @param  {...string} allowedRoles - Roles permitted to access the route
 * @returns {Function} Express middleware
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Role '${req.user.role}' is not authorized to access this resource. Required: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
};

module.exports = authorize;

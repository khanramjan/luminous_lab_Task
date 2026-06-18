/**
 * Centralized Error Handler
 *
 * Catches all errors passed via next(error) and returns
 * a consistent JSON error response.
 *
 * Handles:
 * - ApiError instances → structured response with correct status code
 * - Sequelize ValidationError → 400 with field-level messages
 * - Sequelize UniqueConstraintError → 409 conflict
 * - Unknown errors → 500 with generic message (no stack leak in production)
 */

const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = err.errors.map((e) => e.message);
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'Duplicate entry';
    errors = err.errors.map((e) => e.message);
  }

  // Sequelize foreign key constraint errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Referenced resource does not exist';
  }

  // Don't leak internal error details in production
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal server error';
    errors = [];
  }

  // Log error in development
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[ERROR] ${statusCode} - ${message}`, err.stack ? `\n${err.stack}` : '');
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined,
    ...(process.env.NODE_ENV === 'development' && statusCode === 500 && { stack: err.stack }),
  });
};

module.exports = errorHandler;

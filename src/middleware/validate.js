/**
 * Validation Middleware
 *
 * Accepts a Joi schema and validates the specified request property.
 * Returns 400 with detailed field-level error messages on failure.
 *
 * Usage:
 *   router.post('/tasks', validate(taskSchema), createTask);
 *   router.get('/tasks', validate(taskQuerySchema, 'query'), listTasks);
 */

const ApiError = require('../utils/ApiError');

/**
 * @param {import('joi').ObjectSchema} schema - Joi validation schema
 * @param {string} [property='body'] - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,      // Collect ALL errors, not just the first
      allowUnknown: false,     // Reject unknown fields
      stripUnknown: true,      // Remove unknown fields from validated output
    });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message.replace(/"/g, ''));
      return next(ApiError.badRequest('Validation failed', errorMessages));
    }

    // Replace req[property] with the validated (and sanitized) value
    req[property] = value;
    next();
  };
};

module.exports = validate;

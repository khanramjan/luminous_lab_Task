/**
 * User Validators
 *
 * Joi schemas for user management endpoints.
 */

const Joi = require('joi');

const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100)
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name must not exceed 100 characters',
    }),
  role: Joi.string().valid('admin', 'manager', 'member')
    .messages({
      'any.only': 'Role must be one of: admin, manager, member',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

const userIdParamSchema = Joi.object({
  id: Joi.string().uuid().required()
    .messages({
      'string.guid': 'User ID must be a valid UUID',
      'any.required': 'User ID is required',
    }),
});

module.exports = {
  updateUserSchema,
  userIdParamSchema,
};

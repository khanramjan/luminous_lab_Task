/**
 * Auth Validators
 *
 * Joi schemas for register, login, and refresh token requests.
 */

const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name must not exceed 100 characters',
      'any.required': 'Name is required',
    }),
  email: Joi.string().trim().email().required()
    .messages({
      'string.email': 'Must be a valid email address',
      'any.required': 'Email is required',
    }),
  password: Joi.string().min(6).max(128).required()
    .messages({
      'string.min': 'Password must be at least 6 characters',
      'string.max': 'Password must not exceed 128 characters',
      'any.required': 'Password is required',
    }),
  role: Joi.string().valid('admin', 'manager', 'member').default('member')
    .messages({
      'any.only': 'Role must be one of: admin, manager, member',
    }),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required()
    .messages({
      'string.email': 'Must be a valid email address',
      'any.required': 'Email is required',
    }),
  password: Joi.string().required()
    .messages({
      'any.required': 'Password is required',
    }),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
    .messages({
      'any.required': 'Refresh token is required',
    }),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
};

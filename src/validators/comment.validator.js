/**
 * Comment Validators
 *
 * Joi schemas for comment CRUD endpoints.
 */

const Joi = require('joi');

const createCommentSchema = Joi.object({
  body: Joi.string().trim().min(1).max(5000).required()
    .messages({
      'string.min': 'Comment body cannot be empty',
      'string.max': 'Comment body must not exceed 5000 characters',
      'any.required': 'Comment body is required',
    }),
});

const updateCommentSchema = Joi.object({
  body: Joi.string().trim().min(1).max(5000).required()
    .messages({
      'string.min': 'Comment body cannot be empty',
      'string.max': 'Comment body must not exceed 5000 characters',
      'any.required': 'Comment body is required',
    }),
});

const commentParamsSchema = Joi.object({
  taskId: Joi.string().uuid().required()
    .messages({
      'string.guid': 'Task ID must be a valid UUID',
      'any.required': 'Task ID is required',
    }),
  commentId: Joi.string().uuid()
    .messages({
      'string.guid': 'Comment ID must be a valid UUID',
    }),
});

module.exports = {
  createCommentSchema,
  updateCommentSchema,
  commentParamsSchema,
};

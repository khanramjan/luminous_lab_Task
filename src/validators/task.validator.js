/**
 * Task Validators
 *
 * Joi schemas for task CRUD and query endpoints.
 */

const Joi = require('joi');

const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(2).max(300).required()
    .messages({
      'string.min': 'Title must be at least 2 characters',
      'string.max': 'Title must not exceed 300 characters',
      'any.required': 'Title is required',
    }),
  description: Joi.string().trim().max(5000).allow('', null)
    .messages({
      'string.max': 'Description must not exceed 5000 characters',
    }),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium')
    .messages({
      'any.only': 'Priority must be one of: low, medium, high, critical',
    }),
  status: Joi.string().valid('todo', 'in_progress', 'in_review', 'done').default('todo')
    .messages({
      'any.only': 'Status must be one of: todo, in_progress, in_review, done',
    }),
  assigneeId: Joi.string().uuid().allow(null)
    .messages({
      'string.guid': 'Assignee ID must be a valid UUID',
    }),
  projectId: Joi.string().uuid().required()
    .messages({
      'string.guid': 'Project ID must be a valid UUID',
      'any.required': 'Project ID is required',
    }),
  dueDate: Joi.date().iso().allow(null).min('now')
    .messages({
      'date.min': 'Due date must be in the future',
      'date.format': 'Due date must be a valid ISO date',
    }),
});

const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(2).max(300)
    .messages({
      'string.min': 'Title must be at least 2 characters',
      'string.max': 'Title must not exceed 300 characters',
    }),
  description: Joi.string().trim().max(5000).allow('', null)
    .messages({
      'string.max': 'Description must not exceed 5000 characters',
    }),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical')
    .messages({
      'any.only': 'Priority must be one of: low, medium, high, critical',
    }),
  status: Joi.string().valid('todo', 'in_progress', 'in_review', 'done')
    .messages({
      'any.only': 'Status must be one of: todo, in_progress, in_review, done',
    }),
  assigneeId: Joi.string().uuid().allow(null)
    .messages({
      'string.guid': 'Assignee ID must be a valid UUID',
    }),
  dueDate: Joi.date().iso().allow(null)
    .messages({
      'date.format': 'Due date must be a valid ISO date',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

const taskQuerySchema = Joi.object({
  status: Joi.string().valid('todo', 'in_progress', 'in_review', 'done'),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical'),
  assigneeId: Joi.string().uuid(),
  projectId: Joi.string().uuid(),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'dueDate', 'priority', 'status', 'title').default('createdAt'),
  order: Joi.string().valid('asc', 'desc', 'ASC', 'DESC').default('desc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(200),
});

const taskIdParamSchema = Joi.object({
  id: Joi.string().uuid().required()
    .messages({
      'string.guid': 'Task ID must be a valid UUID',
      'any.required': 'Task ID is required',
    }),
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  taskQuerySchema,
  taskIdParamSchema,
};

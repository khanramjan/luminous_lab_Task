/**
 * Project Validators
 *
 * Joi schemas for project CRUD endpoints.
 */

const Joi = require('joi');

const createProjectSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required()
    .messages({
      'string.min': 'Project name must be at least 2 characters',
      'string.max': 'Project name must not exceed 200 characters',
      'any.required': 'Project name is required',
    }),
  description: Joi.string().trim().max(2000).allow('', null)
    .messages({
      'string.max': 'Description must not exceed 2000 characters',
    }),
});

const updateProjectSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200)
    .messages({
      'string.min': 'Project name must be at least 2 characters',
      'string.max': 'Project name must not exceed 200 characters',
    }),
  description: Joi.string().trim().max(2000).allow('', null)
    .messages({
      'string.max': 'Description must not exceed 2000 characters',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

const projectIdParamSchema = Joi.object({
  id: Joi.string().uuid().required()
    .messages({
      'string.guid': 'Project ID must be a valid UUID',
      'any.required': 'Project ID is required',
    }),
});

module.exports = {
  createProjectSchema,
  updateProjectSchema,
  projectIdParamSchema,
};

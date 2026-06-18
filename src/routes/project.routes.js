/**
 * Project Routes
 *
 * POST   /api/projects      — Create project (admin, manager)
 * GET    /api/projects      — List projects (all authenticated)
 * GET    /api/projects/:id  — Get project by ID
 * PATCH  /api/projects/:id  — Update project (admin, owner)
 * DELETE /api/projects/:id  — Soft delete project (admin)
 */

const router = require('express').Router();
const projectController = require('../controllers/project.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createProjectSchema,
  updateProjectSchema,
  projectIdParamSchema,
} = require('../validators/project.validator');

// All project routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project management
 */

/**
 * @swagger
 * /api/projects:
 *   post:
 *     tags: [Projects]
 *     summary: Create a new project (admin, manager)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Website Redesign
 *               description:
 *                 type: string
 *                 example: Redesign the company website
 *     responses:
 *       201:
 *         description: Project created successfully
 *       403:
 *         description: Not authorized
 */
router.post('/', authorize('admin', 'manager'), validate(createProjectSchema), projectController.createProject);

/**
 * @swagger
 * /api/projects:
 *   get:
 *     tags: [Projects]
 *     summary: List all projects
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Projects retrieved successfully
 */
router.get('/', projectController.listProjects);

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     tags: [Projects]
 *     summary: Get project by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Project retrieved successfully
 *       404:
 *         description: Project not found
 */
router.get('/:id', validate(projectIdParamSchema, 'params'), projectController.getProject);

/**
 * @swagger
 * /api/projects/{id}:
 *   patch:
 *     tags: [Projects]
 *     summary: Update project (admin or owner)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Project updated successfully
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Project not found
 */
router.patch('/:id', authorize('admin', 'manager'), validate(projectIdParamSchema, 'params'), validate(updateProjectSchema), projectController.updateProject);

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     tags: [Projects]
 *     summary: Soft delete project (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *       403:
 *         description: Not authorized (admin only)
 *       404:
 *         description: Project not found
 */
router.delete('/:id', authorize('admin'), validate(projectIdParamSchema, 'params'), projectController.deleteProject);

module.exports = router;

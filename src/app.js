/**
 * Express Application Setup
 *
 * Configures middleware, mounts routes, serves Swagger docs,
 * and attaches the centralized error handler.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const ApiError = require('./utils/ApiError');

// Import route modules
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const projectRoutes = require('./routes/project.routes');
const taskRoutes = require('./routes/task.routes');
const commentRoutes = require('./routes/comment.routes');

const app = express();

// =============================================
// Global Middleware
// =============================================

// Security headers
app.use(helmet());

// CORS
app.use(cors());

// Request logging (skip in test)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiting (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use('/api', apiLimiter);
}

// =============================================
// API Routes
// =============================================

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tasks/:taskId/comments', commentRoutes);

// =============================================
// Swagger API Documentation
// =============================================

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Task Assignment API — Documentation',
}));

// Serve raw OpenAPI JSON spec
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// =============================================
// Health Check
// =============================================

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// =============================================
// 404 Handler
// =============================================

app.use((req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl}`));
});

// =============================================
// Centralized Error Handler (must be last)
// =============================================

app.use(errorHandler);

module.exports = app;

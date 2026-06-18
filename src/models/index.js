/**
 * Model Loader & Associations
 *
 * Loads all Sequelize models, defines relationships,
 * and exports the sequelize instance + models.
 */

const sequelize = require('../config/database');

// Load models
const User = require('./User')(sequelize);
const Project = require('./Project')(sequelize);
const Task = require('./Task')(sequelize);
const Comment = require('./Comment')(sequelize);
const AuditLog = require('./AuditLog')(sequelize);

// =============================================
// Associations
// =============================================

// User → Project (owner)
User.hasMany(Project, { foreignKey: 'ownerId', as: 'ownedProjects' });
Project.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// Project → Task
Project.hasMany(Task, { foreignKey: 'projectId', as: 'tasks' });
Task.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// User → Task (assignee)
User.hasMany(Task, { foreignKey: 'assigneeId', as: 'assignedTasks' });
Task.belongsTo(User, { foreignKey: 'assigneeId', as: 'assignee' });

// Task → Comment
Task.hasMany(Comment, { foreignKey: 'taskId', as: 'comments' });
Comment.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

// User → Comment (author)
User.hasMany(Comment, { foreignKey: 'authorId', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

// Task → AuditLog
Task.hasMany(AuditLog, { foreignKey: 'taskId', as: 'auditLogs' });
AuditLog.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

// User → AuditLog (changedBy)
User.hasMany(AuditLog, { foreignKey: 'changedById', as: 'auditEntries' });
AuditLog.belongsTo(User, { foreignKey: 'changedById', as: 'changedBy' });

module.exports = {
  sequelize,
  User,
  Project,
  Task,
  Comment,
  AuditLog,
};

/**
 * Task Model
 *
 * Fields: id, title, description, priority, status, assigneeId, projectId, dueDate
 * Soft delete enabled (paranoid).
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Task title cannot be empty' },
        len: { args: [2, 300], msg: 'Task title must be between 2 and 300 characters' },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('todo', 'in_progress', 'in_review', 'done'),
      defaultValue: 'todo',
      allowNull: false,
    },
    assigneeId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  }, {
    tableName: 'tasks',
    indexes: [
      { fields: ['assigneeId'] },
      { fields: ['projectId'] },
      { fields: ['status'] },
      { fields: ['priority'] },
      { fields: ['dueDate'] },
    ],
  });

  return Task;
};
